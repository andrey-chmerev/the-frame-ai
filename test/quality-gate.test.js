import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOOK = fileURLToPath(new URL('../templates/hooks/quality-gate.sh', import.meta.url));

// ── Helpers ──────────────────────────────────────────────────────────────────

const TEMP_DIRS = [];

// A stand-in for tsc/eslint/golangci: appends its argv to gate.log, then exits.
// The filename carries the tool keyword (tsc-fake.js, golangci-fake.js) so the
// hook's language guard classifies the command the same way it would a real one.
function fakeTool(label, { exitCode = 0, sleepMs = 0 } = {}) {
  return [
    "const fs = require('fs');",
    sleepMs
      ? `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ${sleepMs});`
      : '',
    `fs.appendFileSync('gate.log', ${JSON.stringify(label)} + ' ' + process.argv.slice(2).join(' ') + '\\n');`,
    `process.exit(${exitCode});`,
  ].join('\n');
}

function makeProject({ typecheck = '', lint = '', tools = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'frame-gate-'));
  TEMP_DIRS.push(dir);
  spawnSync('git', ['init', '-q'], { cwd: dir });
  mkdirSync(join(dir, '.frame'));
  writeFileSync(
    join(dir, '.frame/config.json'),
    JSON.stringify({ quality: { commands: { typecheck, lint } } }),
  );
  mkdirSync(join(dir, 'tools'));
  for (const [name, body] of Object.entries(tools)) {
    writeFileSync(join(dir, 'tools', name), body);
  }
  return dir;
}

function runHook(dir, filePath, env = {}) {
  return spawnSync('bash', [HOOK], {
    cwd: dir,
    input: `${JSON.stringify({ tool_input: { file_path: filePath } })}\n`,
    encoding: 'utf-8',
    env: { ...process.env, ...env },
  });
}

function gateLog(dir, label) {
  const p = join(dir, 'gate.log');
  const lines = existsSync(p) ? readFileSync(p, 'utf-8').trim().split('\n').filter(Boolean) : [];
  return label ? lines.filter(l => l.startsWith(`${label} `)) : lines;
}

// Debounce persists across runs via a stamp in the git dir; drop it when a test
// wants to observe a second real run.
function clearDebounce(dir) {
  rmSync(join(dir, '.git/frame-gate-last'), { force: true });
}

process.on('exit', () => {
  for (const d of TEMP_DIRS) rmSync(d, { recursive: true, force: true });
});

// ── Guard 1: language relevance ──────────────────────────────────────────────

// Regression: the extension check used to guard only the *fallback* commands, so
// a configured `tsc --noEmit` / `go vet ./...` ran on every edit — including .md
// and .planning/* files. With many sessions on one repo that meant dozens of
// concurrent whole-project typechecks.
test('configured typecheck does not run on non-source files', () => {
  const dir = makeProject({
    typecheck: 'node tools/tsc-fake.js',
    lint: 'node tools/eslint-fake.js',
    tools: { 'tsc-fake.js': fakeTool('tsc'), 'eslint-fake.js': fakeTool('eslint') },
  });

  for (const f of ['README.md', '.planning/STATE.md', 'package.json', 'app/globals.css']) {
    clearDebounce(dir);
    const r = runHook(dir, join(dir, f));
    assert.equal(r.status, 0, `${f} should pass the gate`);
  }

  assert.deepEqual(gateLog(dir), [], 'typecheck must not run for non-source files');
});

test('configured typecheck runs on matching source files', () => {
  const dir = makeProject({
    typecheck: 'node tools/tsc-fake.js',
    lint: 'node tools/eslint-fake.js',
    tools: { 'tsc-fake.js': fakeTool('tsc'), 'eslint-fake.js': fakeTool('eslint') },
  });

  const r = runHook(dir, join(dir, 'app/layout.tsx'));

  assert.equal(r.status, 0);
  assert.equal(gateLog(dir, 'tsc').length, 1, 'typecheck should run once for a .tsx file');
});

test('Go tooling is skipped for markdown but runs for .go files', () => {
  const dir = makeProject({
    lint: 'node tools/golangci-fake.js',
    tools: { 'golangci-fake.js': fakeTool('golangci') },
  });

  runHook(dir, join(dir, 'CLAUDE.md'));
  assert.deepEqual(gateLog(dir), [], 'golangci must not run for .md');

  clearDebounce(dir);
  runHook(dir, join(dir, 'internal/app/app.go'));
  assert.equal(gateLog(dir).length, 1, 'golangci should run for .go');
});

test('unknown tooling keeps the previous unfiltered behaviour', () => {
  const dir = makeProject({
    typecheck: 'node tools/custom-check.js',
    tools: { 'custom-check.js': fakeTool('custom') },
  });

  runHook(dir, join(dir, 'notes.md'));

  assert.equal(gateLog(dir).length, 1, 'commands we cannot classify must not be filtered out');
});

// ── Guard 2: lint scoping ────────────────────────────────────────────────────

test('project-wide lint is rescoped to the changed file', () => {
  const dir = makeProject({
    typecheck: 'node tools/tsc-fake.js',
    lint: 'node tools/eslint-fake.js .',
    tools: { 'tsc-fake.js': fakeTool('tsc'), 'eslint-fake.js': fakeTool('eslint') },
  });
  const file = join(dir, 'components/Button.tsx');

  runHook(dir, file);

  const [line] = gateLog(dir, 'eslint');
  assert.ok(line.includes(file), `lint should receive the changed file, got: ${line}`);
  assert.ok(!/\s\.$/.test(line), `trailing project scope should be stripped, got: ${line}`);
});

// ── Guards 3+4: lock and debounce ────────────────────────────────────────────

test('parallel sessions do not pile up concurrent gate runs', () => {
  const dir = makeProject({
    typecheck: 'node tools/tsc-fake.js',
    lint: 'node tools/eslint-fake.js',
    tools: { 'tsc-fake.js': fakeTool('tsc', { sleepMs: 1500 }), 'eslint-fake.js': fakeTool('eslint') },
  });
  const payload = JSON.stringify({ tool_input: { file_path: join(dir, 'app/page.tsx') } });

  // Debounce off, so this exercises the lock alone.
  spawnSync(
    'bash',
    ['-c', `for i in 1 2 3 4 5 6; do (printf '%s\\n' '${payload}' | bash "${HOOK}") & done; wait`],
    { cwd: dir, encoding: 'utf-8', env: { ...process.env, FRAME_GATE_DEBOUNCE: '0' } },
  );

  assert.equal(gateLog(dir, 'tsc').length, 1, 'exactly one of six concurrent hooks should run the gate');
  assert.ok(!existsSync(join(dir, '.git/frame-gate.lock')), 'lock must be released afterwards');
});

test('debounce skips a second run inside the window', () => {
  const dir = makeProject({
    typecheck: 'node tools/tsc-fake.js',
    lint: 'node tools/eslint-fake.js',
    tools: { 'tsc-fake.js': fakeTool('tsc'), 'eslint-fake.js': fakeTool('eslint') },
  });
  const file = join(dir, 'app/page.tsx');

  runHook(dir, file, { FRAME_GATE_DEBOUNCE: '60' });
  runHook(dir, file, { FRAME_GATE_DEBOUNCE: '60' });

  assert.equal(gateLog(dir, 'tsc').length, 1, 'the second edit inside the window should be skipped');
});

// GNU `stat -f` is --file-system: it succeeds and prints filesystem stats
// instead of an mtime, so a BSD-first `stat -f %m || stat -c %Y` silently
// yields garbage on Linux and the debounce/lock arithmetic stops working.
// This stub reproduces that platform on any host, so the regression cannot
// hide until CI runs.
test('debounce survives a GNU-style stat where -f succeeds with garbage', () => {
  const dir = makeProject({
    typecheck: 'node tools/tsc-fake.js',
    lint: 'node tools/eslint-fake.js',
    tools: { 'tsc-fake.js': fakeTool('tsc'), 'eslint-fake.js': fakeTool('eslint') },
  });

  const binDir = join(dir, 'stubbin');
  mkdirSync(binDir);
  writeFileSync(
    join(binDir, 'stat'),
    [
      '#!/bin/sh',
      'if [ "$1" = "-c" ]; then',
      '  node -e "process.stdout.write(String(Math.floor(require(\'fs\').statSync(process.argv[1]).mtimeMs/1000)))" "$3"',
      '  exit 0',
      'fi',
      'if [ "$1" = "-f" ]; then',
      '  echo "  File: \\"$3\\""',
      '  echo "    ID: 0  Namelen: 255  Type: UNKNOWN"',
      '  exit 0',
      'fi',
      'exit 1',
    ].join('\n'),
    { mode: 0o755 },
  );

  const env = { FRAME_GATE_DEBOUNCE: '60', PATH: `${binDir}:${process.env.PATH}` };
  const file = join(dir, 'app/page.tsx');

  runHook(dir, file, env);
  runHook(dir, file, env);

  assert.equal(gateLog(dir, 'tsc').length, 1, 'debounce must hold when only GNU-style stat works');
});

test('FRAME_GATE_NO_GUARD=1 restores an unguarded run on every edit', () => {
  const dir = makeProject({
    typecheck: 'node tools/tsc-fake.js',
    lint: 'node tools/eslint-fake.js',
    tools: { 'tsc-fake.js': fakeTool('tsc'), 'eslint-fake.js': fakeTool('eslint') },
  });
  const file = join(dir, 'app/page.tsx');

  runHook(dir, file, { FRAME_GATE_NO_GUARD: '1' });
  runHook(dir, file, { FRAME_GATE_NO_GUARD: '1' });

  assert.equal(gateLog(dir, 'tsc').length, 2, 'guards disabled — both edits should run the gate');
});

// ── Unchanged contract: the gate still blocks on real failures ───────────────

test('a failing check still exits 2 and records a red gate', () => {
  const dir = makeProject({
    typecheck: 'node tools/tsc-fake.js',
    lint: 'node tools/eslint-fake.js',
    tools: { 'tsc-fake.js': fakeTool('tsc', { exitCode: 1 }), 'eslint-fake.js': fakeTool('eslint') },
  });

  const r = runHook(dir, join(dir, 'app/page.tsx'));

  assert.equal(r.status, 2, 'gate must fail the tool call');
  assert.match(r.stderr, /typecheck failed/);
  assert.match(readFileSync(join(dir, '.git/frame-gate-status'), 'utf-8'), /^fail/);
});

test('a skipped run never overwrites a red gate with a pass', () => {
  const dir = makeProject({
    typecheck: 'node tools/tsc-fake.js',
    lint: 'node tools/eslint-fake.js',
    tools: { 'tsc-fake.js': fakeTool('tsc', { exitCode: 1 }), 'eslint-fake.js': fakeTool('eslint') },
  });
  const file = join(dir, 'app/page.tsx');

  runHook(dir, file, { FRAME_GATE_DEBOUNCE: '60' });
  // Filtered out by the language guard — must not touch the recorded status.
  runHook(dir, join(dir, 'README.md'), { FRAME_GATE_DEBOUNCE: '60' });

  assert.match(readFileSync(join(dir, '.git/frame-gate-status'), 'utf-8'), /^fail/);
});
