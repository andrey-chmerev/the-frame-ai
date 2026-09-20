import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, rmSync, mkdirSync, readFileSync,
  readdirSync, existsSync, writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

// ── Shared install (one-time setup) ─────────────────────────────────────────

let INSTALL_DIR;

before(async () => {
  INSTALL_DIR = mkdtempSync(join(tmpdir(), 'frame-tmpl-'));
  mkdirSync(join(INSTALL_DIR, '.git'));
  process.env.FRAME_LANG = 'en';
  const { init } = await import('../src/init.js?bust=tmpl');
  await init(INSTALL_DIR, { lang: 'en', yes: true });
  delete process.env.FRAME_LANG;
});

after(() => {
  if (INSTALL_DIR) rmSync(INSTALL_DIR, { recursive: true, force: true });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function readMdFiles(dir) {
  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      name: f,
      rel: relative(INSTALL_DIR, join(dir, f)),
      content: readFileSync(join(dir, f), 'utf-8'),
    }));
}

// Minimal YAML frontmatter parser (single-line values only)
function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return fm;
}

// Returns false if pattern has unbalanced brackets or parens — signals a truncated extraction
// caused by shell-quoting tricks ('"'"') rather than a real ERE pattern.
function isBalancedBracketsAndParens(pattern) {
  let depth = 0;
  let inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (pattern[i - 1] === '\\') continue; // escaped char
    if (inClass) {
      if (ch === ']') inClass = false;
    } else if (ch === '[') {
      inClass = true;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
    }
  }
  return depth === 0 && !inClass;
}

// Extract grep -E pattern strings from template text (single- and double-quoted)
function extractGrepEPatterns(text) {
  const re = /\bgrep\b[^\n]*\s-E\s+('[^'\n]*'|"[^"\n]*")/g;
  const results = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push(m[1].slice(1, -1)); // strip surrounding quotes
  }
  return results;
}

// ── 1. No unresolved placeholders after install ──────────────────────────────

test('templates: no {{VAR}} or {quality.commands.*} placeholders survive install', () => {
  const dirs = [
    join(INSTALL_DIR, '.claude/commands'),
    join(INSTALL_DIR, '.claude/agents'),
  ];
  const extras = [
    join(INSTALL_DIR, 'CLAUDE.md'),
    join(INSTALL_DIR, '.planning/STATE.md'),
    join(INSTALL_DIR, '.planning/MAP.md'),
    join(INSTALL_DIR, '.planning/ROADMAP.md'),
    join(INSTALL_DIR, '.planning/CONTEXT.md'),
  ];

  const badFiles = [];

  for (const d of dirs) {
    for (const { rel, content } of readMdFiles(d)) {
      if (/\{\{[A-Z_]+\}\}/.test(content) || /\{quality\.commands\.\w+\}/.test(content)) {
        badFiles.push(rel);
      }
    }
  }

  for (const f of extras) {
    if (!existsSync(f)) continue;
    const content = readFileSync(f, 'utf-8');
    if (/\{\{[A-Z_]+\}\}/.test(content) || /\{quality\.commands\.\w+\}/.test(content)) {
      badFiles.push(relative(INSTALL_DIR, f));
    }
  }

  assert.deepEqual(badFiles, [], `Files with unresolved placeholders: ${badFiles.join(', ')}`);
});

// ── 2. All installer-created paths exist ─────────────────────────────────────

test('templates: installer creates all required paths', () => {
  const required = [
    '.planning/STATE.md',
    '.planning/MAP.md',
    '.planning/ROADMAP.md',
    '.planning/CONTEXT.md',
    '.planning/memory',
    '.planning/reports/audit',
    'docs/specs',
    'docs/specs/archive',
    '.frame/config.json',
    '.frame/.frame-version',
  ];

  const missing = required.filter(p => !existsSync(join(INSTALL_DIR, p)));
  assert.deepEqual(missing, [], `Missing after install: ${missing.join(', ')}`);
});

// ── 3. Agent references in commands match installed agents ───────────────────

test('templates: agent names referenced in commands match installed agents', () => {
  const agentDir = join(INSTALL_DIR, '.claude/agents');
  const installed = new Set(
    readMdFiles(agentDir)
      .map(({ content }) => parseFrontmatter(content)?.name)
      .filter(Boolean)
  );

  const invalid = [];

  for (const { name: cmdFile, content } of readMdFiles(join(INSTALL_DIR, '.claude/commands'))) {
    // Agent list items after "agents in parallel:" section.
    // @-mentions are skipped: they appear inside backtick code spans and mix agent names
    // with npm packages (@playwright, @mui) and TS directives (@ts-ignore).
    const parallelSection = content.match(
      /agents\s+in\s+parallel[:\s]*\n((?:\s{2,}-\s+\S[^\n]*\n)+)/i
    );
    if (parallelSection) {
      for (const m of parallelSection[1].matchAll(/\s{2,}-\s+([a-z][a-z0-9-]+)\s*$/gm)) {
        if (!installed.has(m[1])) {
          invalid.push({ file: cmdFile, ref: `parallel-list:${m[1]}` });
        }
      }
    }
  }

  assert.deepEqual(invalid, [], `Invalid agent refs: ${JSON.stringify(invalid, null, 2)}`);
});

// ── 4. config.json structure and no placeholder project name ─────────────────

test('templates: config.json has required keys and resolved project name', () => {
  const config = JSON.parse(readFileSync(join(INSTALL_DIR, '.frame/config.json'), 'utf-8'));

  assert.notEqual(config.project, '{{PROJECT_NAME}}', 'config.project must not remain a literal placeholder');
  assert.equal(typeof config.project, 'string');
  assert.ok(config.project.length > 0, 'config.project must be non-empty');

  for (const key of ['typecheck', 'test', 'lint', 'build']) {
    assert.ok(
      config.quality?.commands?.[key],
      `config.quality.commands.${key} must exist`
    );
  }

  assert.equal(
    config.archive?.archivePath,
    'docs/specs/archive',
    'archive.archivePath must match the directory the installer creates'
  );
});

// ── 5. grep -E patterns are valid ERE (BSD-compatible) ───────────────────────

test('templates: grep -E patterns are valid ERE on the system grep', () => {
  const allFiles = [
    ...readMdFiles(join(INSTALL_DIR, '.claude/commands')),
    ...readMdFiles(join(INSTALL_DIR, '.claude/agents')),
  ];

  const invalid = [];

  for (const { rel, content } of allFiles) {
    for (const pattern of extractGrepEPatterns(content)) {
      // Skip patterns truncated by shell-quoting tricks ('"'"' style) — unbalanced brackets
      // signal extraction artifacts, not real ERE patterns.
      if (!isBalancedBracketsAndParens(pattern)) continue;

      // Pass via -e so patterns starting with '-' aren't misread as flags.
      const result = spawnSync('grep', ['-E', '-e', pattern, '/dev/null'], {
        timeout: 2000,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      // exit 0 = matched, exit 1 = no match (valid), exit 2 = error (invalid pattern)
      if (result.status === 2) {
        invalid.push({ file: rel, pattern });
      }
    }
  }

  assert.deepEqual(invalid, [], `Invalid grep -E patterns:\n${JSON.stringify(invalid, null, 2)}`);
});

// ── 6. Frontmatter completeness ───────────────────────────────────────────────

test('templates: every command and agent has frontmatter with description', () => {
  const VALID_MODELS = new Set(['sonnet', 'opus', 'haiku']);
  const issues = [];

  const entries = [
    ...readMdFiles(join(INSTALL_DIR, '.claude/commands')).map(f => ({ ...f, type: 'command' })),
    ...readMdFiles(join(INSTALL_DIR, '.claude/agents')).map(f => ({ ...f, type: 'agent' })),
  ];

  for (const { rel, content, type } of entries) {
    const fm = parseFrontmatter(content);

    if (!fm) {
      issues.push(`${rel}: no frontmatter block`);
      continue;
    }

    if (!fm.description) {
      issues.push(`${rel}: missing description`);
    }

    if (type === 'agent' && !fm.name) {
      issues.push(`${rel}: agent missing name`);
    }

    if (fm.model && !VALID_MODELS.has(fm.model)) {
      issues.push(`${rel}: model "${fm.model}" is not a valid alias (sonnet/opus/haiku)`);
    }
  }

  assert.deepEqual(issues, [], `Frontmatter issues:\n${issues.join('\n')}`);
});

// ── 7. No {quality.commands.*} keys in templates reference unknown config keys


test('templates: {quality.commands.*} placeholders in source templates match config schema', () => {
  const TEMPLATES_DIR = new URL('../templates', import.meta.url).pathname;
  const configSchema = JSON.parse(
    readFileSync(join(TEMPLATES_DIR, 'project/config.json'), 'utf-8')
  );
  const validKeys = new Set(Object.keys(configSchema.quality.commands));

  const cmdDir = join(TEMPLATES_DIR, 'commands');
  const agentDir = join(TEMPLATES_DIR, 'agents');

  const unknown = [];

  for (const dir of [cmdDir, agentDir]) {
    for (const f of readdirSync(dir).filter(f => f.endsWith('.md'))) {
      const content = readFileSync(join(dir, f), 'utf-8');
      for (const m of content.matchAll(/\{quality\.commands\.(\w+)\}/g)) {
        if (!validKeys.has(m[1])) {
          unknown.push({ file: f, key: m[1] });
        }
      }
    }
  }

  assert.deepEqual(unknown, [], `Unknown quality.commands keys in templates: ${JSON.stringify(unknown)}`);
});

// ── 8. No references to deleted commands in templates ─────────────────────────

test('templates: no references to deleted commands', () => {
  const DELETED_COMMANDS = [
    'frame:wave',
    'frame:security',
    'frame:performance',
    'frame:check-deps',
    'frame:estimate',
    'frame:headless',
    'frame:perf-fix',
    'frame:security-fix',
    'frame:sprint-check',
    'frame:status',
    'frame:forensics',
    'frame:rollback',
    'frame:context',
    'frame:explain',
    'frame:where',
  ];

  // Files that will be deleted in a later wave — skip them from this check.
  const TO_BE_DELETED = new Set([
    'frame:security.md',
    'frame:performance.md',
    'frame:check-deps.md',
  ]);

  const TEMPLATES_DIR = new URL('../templates', import.meta.url).pathname;
  const dirs = [
    join(TEMPLATES_DIR, 'commands'),
    join(TEMPLATES_DIR, 'agents'),
  ];

  const violations = [];

  for (const dir of dirs) {
    for (const f of readdirSync(dir).filter(f => f.endsWith('.md'))) {
      if (TO_BE_DELETED.has(f)) continue; // will be removed in a later wave
      const content = readFileSync(join(dir, f), 'utf-8');
      for (const cmd of DELETED_COMMANDS) {
        // Match /frame:cmd followed by word boundary (space, backtick, newline, end, colon)
        const pattern = new RegExp(`/${cmd}(?=[\\s\`'",)\\]]|$)`, 'm');
        if (pattern.test(content)) {
          violations.push({ file: f, ref: `/${cmd}` });
        }
      }
    }
  }

  assert.deepEqual(violations, [], `References to deleted commands:\n${JSON.stringify(violations, null, 2)}`);
});

// ── 9. Agent templates do not write STATE.md (rule 13.1) ─────────────────────

test('templates: agent files must not contain STATE.md write instructions', () => {
  const TEMPLATES_DIR = new URL('../templates', import.meta.url).pathname;
  const agentDir = join(TEMPLATES_DIR, 'agents');

  const violations = [];

  for (const f of readdirSync(agentDir).filter(f => f.endsWith('.md'))) {
    const content = readFileSync(join(agentDir, f), 'utf-8');
    // Detect write instructions (not "NEVER write" prohibition notices)
    // Matches: "write to .planning/STATE.md" or "Update .planning/STATE.md"
    // but not lines containing "NEVER" before the pattern.
    const lines = content.split('\n');
    const hasWritePattern = lines.some(line => {
      const lower = line.toLowerCase();
      if (lower.includes('never')) return false; // prohibition, not instruction
      return /(?:write\s+to|update)\s+[`'"]?\.planning\/state\.md/i.test(line)
        || /immediately\s+write\s+to\s+[`'"]?\.planning\/state/i.test(line);
    });
    if (hasWritePattern) {
      violations.push(f);
    }
  }

  assert.deepEqual(violations, [], `Agent files that write STATE.md (violates rule 13.1):\n${violations.join('\n')}`);
});

// ── 10. auto-pilot.sh Stop hook is session-bound ─────────────────────────────
// The marker lives in the shared $GIT_DIR — without the session= guard the hook
// nudges every chat working in the tree, not just the one flying the pipeline.

test('templates: auto-pilot.sh only nudges the session that owns the flight', () => {
  const TEMPLATES_DIR = new URL('../templates', import.meta.url).pathname;
  const hook = join(TEMPLATES_DIR, 'hooks', 'auto-pilot.sh');

  const repo = mkdtempSync(join(tmpdir(), 'frame-autopilot-'));
  try {
    spawnSync('git', ['init', '-q', repo]);
    mkdirSync(join(repo, '.planning'), { recursive: true });
    writeFileSync(join(repo, '.planning', 'STATE.md'), '- Phase: BUILD\n- Status: IN_PROGRESS\n');

    const runHook = (stdinJson) => spawnSync('bash', [hook], {
      cwd: repo, input: stdinJson, encoding: 'utf-8',
    });
    const marker = join(repo, '.git', 'frame-autopilot');
    const nudges = join(repo, '.git', 'frame-autopilot-nudges');

    // Foreign session: silent no-op, nudge counter untouched
    writeFileSync(marker, 'feature=x\nround=0\nreview=standard\nsession=owner-session\n');
    const foreign = runHook('{"session_id":"other-session"}');
    assert.equal(foreign.status, 0, `foreign session must exit 0, stderr: ${foreign.stderr}`);
    assert.ok(!existsSync(nudges), 'foreign session must not touch the nudge counter');

    // Owning session: nudged (exit 2)
    const owner = runHook('{"session_id":"owner-session"}');
    assert.equal(owner.status, 2, `owner session must be nudged (exit 2), stderr: ${owner.stderr}`);

    // Legacy marker without session=: nudges as before (backward compat)
    rmSync(nudges, { force: true });
    writeFileSync(marker, 'feature=x\nround=0\nreview=standard\n');
    const legacy = runHook('{"session_id":"whatever"}');
    assert.equal(legacy.status, 2, 'legacy marker without session= must keep old behavior');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// ── 11. Unattended pipeline: no confirmation gate, product-only halts ────────
// The autopilot asks nothing after research. Technical findings — whatever their
// severity or file — are fixed in-flight; only a decision the repo cannot answer
// (Class: product) comes back to the user.

test('templates: /frame:auto engages without a confirmation question', () => {
  const auto = readFileSync(join(INSTALL_DIR, '.claude', 'commands', 'frame:auto.md'), 'utf-8');

  assert.ok(/no confirmation gate/i.test(auto), 'auto.md must state that there is no confirmation gate');
  assert.match(auto, /Step 2: Engage/, 'Step 2 must engage the flight, not gate it');

  // The old gate's prompt must be gone — its presence means the flight still waits for input.
  assert.doesNotMatch(auto, /Proceed\? \[go \/ abort/, 'the go/abort prompt must not survive');
  assert.doesNotMatch(auto, /The one confirmation gate/, 'the confirmation-gate step must not survive');

  // The marker is written by Step 2 itself, so a flight that never asked still flies.
  assert.match(auto, /printf 'feature=%s\\nround=0/, 'Step 2 must write the autopilot marker');
});

test('templates: autopilot halts on product decisions, not on sensitive areas', () => {
  const dir = join(INSTALL_DIR, '.claude', 'commands');
  const auto = readFileSync(join(dir, 'frame:auto.md'), 'utf-8');
  const fix = readFileSync(join(dir, 'frame:fix.md'), 'utf-8');

  // Screening is by finding class, not by file path.
  assert.match(auto, /Class: technical/, 'auto.md must screen findings by Class');
  assert.match(auto, /product decision needed/i, 'auto.md must halt on a product decision');
  assert.match(fix, /Screen for product decisions/, 'fix.md Step 3 must screen for product decisions');

  // The old area-based gate is what forced the manual /frame:fix run — it must be gone.
  const areaHalt = /(HALT|halt)[^\n]*\b(auth|money)\/(money|core)/;
  assert.doesNotMatch(auto, areaHalt, 'auto.md must not halt merely because a fix touches a sensitive area');
  assert.doesNotMatch(
    fix,
    /any CRITICAL\/HIGH finding on core\/auth\/money\/migrations\/routing → \*\*halt/,
    'fix.md AUTO mode must not halt on area alone',
  );
});

test('templates: review classifies findings and continues into fixes', () => {
  const review = readFileSync(join(INSTALL_DIR, '.claude', 'commands', 'frame:review.md'), 'utf-8');

  assert.match(review, /\*\*Class\*\*: technical \| product/, 'the finding schema must carry Class');
  assert.match(review, /Step 3\.6: Classify every finding/, 'review must have a classification step');
  assert.match(review, /continuing into \/frame:fix/, 'review must continue into fix instead of printing a command');
});

test('templates: architecture-first decision standard reaches agents and principles', () => {
  const principles = readFileSync(join(INSTALL_DIR, '.frame', 'frame-principles.md'), 'utf-8');
  assert.match(principles, /Decision Standard \(architecture-first\)/, 'principles must carry the decision standard');
  assert.match(principles, /product decision/, 'principles must define the product class');

  const agentsDir = join(INSTALL_DIR, '.claude', 'agents');
  for (const name of ['researcher.md', 'builder.md', 'reviewer.md', 'devils-advocate.md']) {
    const content = readFileSync(join(agentsDir, name), 'utf-8');
    assert.match(content, /Decision Standard \(architecture-first\)/, `${name} must carry the decision standard`);
  }
});

// ── 12. Evidence / Artifact check — review proves the result, not only the diff ──
// A spec carries a mandatory `## Evidence` list; /frame:review collects every item as a
// real artifact before the panel and fails with `REVIEW_FAILED (evidence)` on a mismatch;
// fix/auto/build route that status like `REVIEW_FAILED`; manual items gate ship.

test('templates: spec template and /frame:plan carry a mandatory Evidence section', () => {
  const TEMPLATES_DIR = new URL('../templates', import.meta.url).pathname;
  const specTemplate = readFileSync(join(TEMPLATES_DIR, 'project/specs/_template/spec.md'), 'utf-8');
  assert.match(specTemplate, /^## Evidence$/m, 'spec template must have an ## Evidence section');
  assert.match(specTemplate, /manual:/, 'spec template must document the manual: prefix');

  const plan = readFileSync(join(INSTALL_DIR, '.claude', 'commands', 'frame:plan.md'), 'utf-8');
  assert.match(plan, /^## Evidence$/m, 'plan.md spec shape must include ## Evidence');
  assert.match(plan, /empty or missing `## Evidence`/, 'an empty Evidence list must be a plan blocker');
  assert.match(plan, /Weak evidence/, 'plan must read Weak evidence anti-patterns from memory');
});

test('templates: /frame:review runs the artifact check between gates and panel', () => {
  const review = readFileSync(join(INSTALL_DIR, '.claude', 'commands', 'frame:review.md'), 'utf-8');

  const gates = review.indexOf('### Step 2: Collect automated gate results');
  const artifact = review.indexOf('### Step 2.5: Artifact check');
  const panel = review.indexOf('### Step 3: Parallel reviewer panel');
  assert.ok(gates > -1 && artifact > -1 && panel > -1, 'Steps 2, 2.5 and 3 must all exist');
  assert.ok(gates < artifact && artifact < panel, 'the artifact check must sit between the gates and the panel');

  assert.match(review, /REVIEW_FAILED \(evidence\)/, 'a failed artifact check must set REVIEW_FAILED (evidence)');
  assert.match(review, /docs\/specs\/\{feature\}\/evidence\.md/, 'review must write evidence.md');
  assert.match(review, /docs\/specs\/\{feature\}\/evidence\//, 'artifacts must be stored under evidence/');
  assert.match(review, /Matches spec/, 'evidence.md must carry the "matches spec" column');
  assert.match(review, /Source: evidence/, 'failed items must become Source: evidence findings for /frame:fix');
  assert.match(review, /not run — evidence failed/, 'the panel must be recorded as not run on evidence failure');
  assert.match(review, /`manual:`/, 'review must handle manual: items');
  assert.match(review, /Runs Steps 0–2\.5 exactly as standard/, 'strict mode must include the artifact check');
});

test('templates: REVIEW_FAILED (evidence) is routed into the fix cycle by fix, auto and build', () => {
  const dir = join(INSTALL_DIR, '.claude', 'commands');
  const fix = readFileSync(join(dir, 'frame:fix.md'), 'utf-8');
  const auto = readFileSync(join(dir, 'frame:auto.md'), 'utf-8');
  const build = readFileSync(join(dir, 'frame:build.md'), 'utf-8');

  assert.match(fix, /PRIOR_STATUS/, 'fix must capture the status review left before overwriting it');
  assert.match(fix, /REVIEW_FAILED \(evidence\)/, 'fix must recognise the evidence status');
  assert.match(fix, /\| evidence \|/, 'fix Step 7 must route Source: evidence to artifact re-collection');
  assert.doesNotMatch(fix, /restore STATE\.md `Status: REVIEW_FAILED`,/, 'fix must restore PRIOR_STATUS, not a hard-coded REVIEW_FAILED');
  assert.match(fix, /continuing into \/frame:review/, 'evidence-only fixes must re-enter review, not ship');

  assert.match(auto, /\*\*REVIEW_FAILED \(evidence\)\*\*/, 'auto Step 4 must route the evidence status');
  assert.match(auto, /`ready for review`/, 'auto Step 5 must open the next round after evidence-only fixes');
  assert.match(auto, /manual evidence item\(s\) need your confirmation/, 'auto must halt at ship on pending manual evidence');

  assert.match(build, /`Status: REVIEW_FAILED \(evidence\)` → \*\*Mode: fix\*\*/, 'build fix-mode must accept the evidence variant');
});

test('templates: manual evidence reaches test-plan and gates ship', () => {
  const dir = join(INSTALL_DIR, '.claude', 'commands');
  const testPlan = readFileSync(join(dir, 'frame:test-plan.md'), 'utf-8');
  const ship = readFileSync(join(dir, 'frame:ship.md'), 'utf-8');

  assert.match(testPlan, /### Evidence \(manual\)/, 'test-plan must list manual evidence items');
  assert.match(testPlan, /evidence\.md/, 'test-plan must read evidence.md');

  assert.match(ship, /\| Evidence \|/, 'the readiness passport must have an Evidence row');
  assert.match(ship, /PENDING manual/, 'pending manual evidence must be a passport state');
  assert.match(ship, /Evidence is `PASS` or `n\/a`/, 'READY must require Evidence PASS or n/a');
});

test('templates: retrospective asks about bugs behind green evidence and records weak items', () => {
  const retro = readFileSync(join(INSTALL_DIR, '.claude', 'commands', 'frame:retrospective.md'), 'utf-8');
  assert.match(retro, /Step 3\.4: Evidence audit/, 'retrospective must have the evidence audit step');
  assert.match(retro, /Anti-pattern: Weak evidence/, 'weak evidence must be recorded as an anti-pattern in learnings.md');
  assert.match(retro, /\*\*Correct approach\*\*: the evidence item must read/, 'the entry must carry the stronger item wording');
});

test('templates: builder agent has an evidence mode that collects proof without editing code', () => {
  const builder = readFileSync(join(INSTALL_DIR, '.claude', 'agents', 'builder.md'), 'utf-8');
  assert.match(builder, /\| \*\*evidence\*\* \|/, 'builder must list the evidence mode');
  assert.match(builder, /### evidence mode/, 'builder must have the evidence-mode execution flow');
  assert.match(builder, /Do NOT edit source, tests, plan\.md, review\.md, evidence\.md or STATE\.md/, 'evidence mode must be collect-only');
});
