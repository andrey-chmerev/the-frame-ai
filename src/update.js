import { join } from 'node:path';
import { readdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { TEMPLATES_DIR, VERSION, log, logSuccess } from './manifest.js';
import {
  copyDir,
  makeExecutable,
  fileExists,
  applyVars,
  writeFile,
  ensureDir,
  mergeFrameSettings,
  writeMcpConfig,
  hashContent,
  readManifest,
  writeManifest,
} from './utils.js';
import { promptFrontend } from './languages.js';


// Commands removed in v0.14.0 and their replacements
const COMMAND_REPLACEMENTS = {
  'frame:security.md': '/frame:audit security',
  'frame:performance.md': '/frame:audit performance',
  'frame:check-deps.md': '/frame:audit deps',
  'frame:estimate.md': '/frame:plan (estimates are now per-task)',
  'frame:headless.md': 'claude -p "/frame:build {feature}" (see README)',
};

export async function update(target, flags = {}) {
  if (!fileExists(join(target, '.frame', 'config.json'))) {
    console.error(`\x1b[31m✗\x1b[0m FRAME not installed in this project.`);
    console.log('Run `the-frame init` first.');
    return;
  }

  const versionPath = join(target, '.frame', '.frame-version');
  let installedVersion = 'unknown';
  if (fileExists(versionPath)) {
    installedVersion = readFileSync(versionPath, 'utf-8').trim();
  }

  const config = JSON.parse(readFileSync(join(target, '.frame', 'config.json'), 'utf-8'));
  const vars = { PROJECT_NAME: config.project ?? '', LANGUAGE: config.language ?? '' };
  const qualityVars = Object.fromEntries(
    Object.entries(config.quality?.commands ?? {}).map(([k, v]) => [`quality.commands.${k}`, v])
  );

  // Load manifest of files installed by FRAME (to detect user-modified files)
  const manifestPath = join(target, '.frame', 'manifest.json');
  const oldManifest = readManifest(manifestPath);
  const newManifest = {};

  if (flags.dryRun) {
    log(`\nFRAME dry-run: ${installedVersion} → ${VERSION}\n`);
    log('Files that would be updated:');

    const sections = [
      { src: join(TEMPLATES_DIR, 'commands'), label: '.claude/commands/' },
      { src: join(TEMPLATES_DIR, 'agents'), label: '.claude/agents/' },
      { src: join(TEMPLATES_DIR, 'hooks'), label: '.claude/hooks/' },
    ];
    let total = 0;
    for (const { src, label } of sections) {
      const files = readdirSync(src).filter((f) => !f.startsWith('.'));
      files.forEach((f) => {
        const destKey = `${label}${f}`;
        const destFull = join(target, destKey);
        const templateContent = applyVars(readFileSync(join(src, f), 'utf-8'), vars, qualityVars);
        const newHash = hashContent(templateContent);
        if (existsSync(destFull)) {
          const currentHash = hashContent(readFileSync(destFull, 'utf-8'));
          const installedHash = oldManifest[destKey];
          if (currentHash !== installedHash && installedHash !== undefined) {
            log(`  ? ${destKey} (user-modified — would skip; use --force to overwrite)`);
          } else {
            log(`  ~ ${destKey}`);
          }
        } else {
          log(`  + ${destKey} (new)`);
        }
        total++;
      });
    }

    // Detect orphans (in manifest but not in new templates)
    const allNewKeys = new Set(
      sections.flatMap(({ src, label }) =>
        readdirSync(src).filter((f) => !f.startsWith('.')).map((f) => `${label}${f}`)
      )
    );
    const orphans = Object.keys(oldManifest).filter((k) => !allNewKeys.has(k));
    if (orphans.length > 0) {
      log('\n  Orphaned files (renamed/removed in framework, user copy remains):');
      orphans.forEach((o) => log(`  ! ${o}`));
    }

    log(`\n  Note: project files (STATE.md, MAP.md, memory/, etc.) are never updated`);
    log(`\nTotal: ${total} files would be updated. Run without --dry-run to apply.\n`);
    return;
  }

  log(`\nFRAME update: ${installedVersion} → ${VERSION}\n`);

  // Ask frontend question early, before file operations
  let frontendDecided = config.frontend === true;
  if (config.frontend === undefined && !flags.yes) {
    const frontend = await promptFrontend(false);
    config.frontend = frontend;
    frontendDecided = frontend;
    writeFileSync(join(target, '.frame', 'config.json'), JSON.stringify(config, null, 2), 'utf-8');
  }

  let updated = 0;
  let skipped = 0;

  // Helper: update a single framework file respecting manifest
  function updateFile(destPath, destKey, content) {
    const newHash = hashContent(content);
    newManifest[destKey] = newHash;
    if (existsSync(destPath)) {
      const currentHash = hashContent(readFileSync(destPath, 'utf-8'));
      const installedHash = oldManifest[destKey];
      // Skip if user has modified the file (current differs from what we installed)
      if (installedHash !== undefined && currentHash !== installedHash && !flags.force) {
        log(`  skip ${destKey} (user-modified)`);
        skipped++;
        return;
      }
    }
    writeFile(destPath, content);
    updated++;
  }

  // 1. Update commands
  const commandsSrc = join(TEMPLATES_DIR, 'commands');
  const commandsDest = join(target, '.claude', 'commands');
  ensureDir(commandsDest);
  for (const f of readdirSync(commandsSrc).filter((f) => f.endsWith('.md'))) {
    const content = applyVars(readFileSync(join(commandsSrc, f), 'utf-8'), vars, qualityVars);
    const destKey = `.claude/commands/${f}`;
    updateFile(join(commandsDest, f), destKey, content);
  }

  // Detect orphaned command files
  for (const f of readdirSync(commandsDest).filter((f) => f.endsWith('.md'))) {
    const key = `.claude/commands/${f}`;
    if (key in oldManifest && !existsSync(join(commandsSrc, f))) {
      const replacement = COMMAND_REPLACEMENTS[f];
      if (replacement) {
        log(`  orphan ${key} (removed in v0.14.0 → use: ${replacement})`);
      } else {
        log(`  orphan ${key} (removed from framework; delete manually if no longer needed)`);
      }
    }
  }

  // Ensure audit reports directory exists (added in v0.14.0)
  ensureDir(join(target, '.planning', 'reports', 'audit'));

  // 2. Update agents
  const agentsSrc = join(TEMPLATES_DIR, 'agents');
  const agentsDest = join(target, '.claude', 'agents');
  ensureDir(agentsDest);
  for (const f of readdirSync(agentsSrc).filter((f) => f.endsWith('.md'))) {
    const content = applyVars(readFileSync(join(agentsSrc, f), 'utf-8'), vars, qualityVars);
    const destKey = `.claude/agents/${f}`;
    updateFile(join(agentsDest, f), destKey, content);
  }

  // 3. Update hooks (always overwrite — hooks are infrastructure, not user-editable)
  const hooksSrc = join(TEMPLATES_DIR, 'hooks');
  const hooksDest = join(target, '.claude', 'hooks');
  ensureDir(hooksDest);
  for (const hook of readdirSync(hooksSrc)) {
    const srcPath = join(hooksSrc, hook);
    const destPath = join(hooksDest, hook);
    const content = readFileSync(srcPath, 'utf-8');
    writeFile(destPath, content);
    makeExecutable(destPath);
    newManifest[`.claude/hooks/${hook}`] = hashContent(content);
    updated++;
  }

  // 4. Apply Playwright MCP if frontend
  if (frontendDecided) {
    writeMcpConfig(join(target, '.mcp.json'));
  }

  // 5. Always re-merge hooks and permissions into settings.json
  mergeFrameSettings(join(target, '.claude', 'settings.json'));

  // 6. Write new version and updated manifest
  writeFileSync(join(target, '.frame', '.frame-version'), VERSION, 'utf-8');
  writeManifest(manifestPath, newManifest);

  logSuccess(`Updated: ${updated} framework files${skipped > 0 ? ` (${skipped} user-modified files skipped; use --force to overwrite)` : ''}`);

  log(`\nFRAME updated: v${installedVersion} → v${VERSION}\n`);
}
