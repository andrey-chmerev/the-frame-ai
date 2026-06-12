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
  mergeVscodeSettings,
  mergeFrameSettings,
  writeMcpConfig,
  mergeVscodeMcp,
  hashContent,
  readManifest,
  writeManifest,
} from './utils.js';
import { promptFrontend } from './languages.js';


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

    if (config.copilot || flags.copilot) {
      const files = readdirSync(join(TEMPLATES_DIR, 'commands')).filter((f) => f.endsWith('.md'));
      files.forEach((f) => log(`  ~ .github/prompts/${f.replace(/\.md$/, '.prompt.md')}`));
      total += files.length;
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
      log(`  orphan ${key} (removed from framework; delete manually if no longer needed)`);
    }
  }

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

  // 4. Update Copilot prompts
  if (config.copilot || flags.copilot) {
    const promptsDest = join(target, '.github', 'prompts');
    ensureDir(promptsDest);
    for (const f of readdirSync(commandsDest).filter((f) => f.endsWith('.md'))) {
      writeFile(join(promptsDest, f.replace(/\.md$/, '.prompt.md')), readFileSync(join(commandsDest, f), 'utf-8'));
    }
    const vscodeDest = join(target, '.vscode');
    ensureDir(vscodeDest);
    mergeVscodeSettings(join(vscodeDest, 'settings.json'));
    updated += readdirSync(commandsDest).filter((f) => f.endsWith('.md')).length;
    if (flags.copilot && !config.copilot) {
      config.copilot = true;
      writeFileSync(join(target, '.frame', 'config.json'), JSON.stringify(config, null, 2), 'utf-8');
    }
  }

  // 5. Apply Playwright MCP if frontend
  if (frontendDecided) {
    writeMcpConfig(join(target, '.mcp.json'));
    if (config.copilot) mergeVscodeMcp(join(target, '.vscode', 'mcp.json'));
  }

  // 5b. Always re-merge hooks and permissions into settings.json
  mergeFrameSettings(join(target, '.claude', 'settings.json'));

  // 6. Write new version and updated manifest
  writeFileSync(join(target, '.frame', '.frame-version'), VERSION, 'utf-8');
  writeManifest(manifestPath, newManifest);

  logSuccess(`Updated: ${updated} framework files${skipped > 0 ? ` (${skipped} user-modified files skipped; use --force to overwrite)` : ''}`);

  log(`\nFRAME updated: v${installedVersion} → v${VERSION}\n`);
}
