import { join } from 'node:path';
import { readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { TEMPLATES_DIR, VERSION, log, logSuccess } from './manifest.js';
import { copyDir, makeExecutable, fileExists, applyVars, writeFile } from './utils.js';


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
      files.forEach((f) => log(`  ~ ${label}${f}`));
      total += files.length;
    }
    log(`\n  Note: project files (STATE.md, MAP.md, memory/, etc.) are never updated`);
    log(`\nTotal: ${total} files would be updated. Run without --dry-run to apply.\n`);
    return;
  }

  log(`\nFRAME update: ${installedVersion} → ${VERSION}\n`);

  // Read project config for variable substitution
  const config = JSON.parse(readFileSync(join(target, '.frame', 'config.json'), 'utf-8'));
  const vars = { PROJECT_NAME: config.project ?? '', LANGUAGE: config.language ?? '' };
  const qualityVars = Object.fromEntries(
    Object.entries(config.quality?.commands ?? {}).map(([k, v]) => [`quality.commands.${k}`, v])
  );

  let updated = 0;

  // 1. Update commands
  const commandsSrc = join(TEMPLATES_DIR, 'commands');
  const commandsDest = join(target, '.claude', 'commands');
  copyDir(commandsSrc, commandsDest);
  for (const f of readdirSync(commandsDest).filter((f) => f.endsWith('.md'))) {
    const p = join(commandsDest, f);
    writeFile(p, applyVars(readFileSync(p, 'utf-8'), vars, qualityVars));
  }
  updated += readdirSync(commandsSrc).filter((f) => f.endsWith('.md')).length;

  // 2. Update agents
  const agentsSrc = join(TEMPLATES_DIR, 'agents');
  const agentsDest = join(target, '.claude', 'agents');
  copyDir(agentsSrc, agentsDest);
  for (const f of readdirSync(agentsDest).filter((f) => f.endsWith('.md'))) {
    const p = join(agentsDest, f);
    writeFile(p, applyVars(readFileSync(p, 'utf-8'), vars, qualityVars));
  }
  updated += readdirSync(agentsSrc).filter((f) => f.endsWith('.md')).length;

  // 3. Update hooks
  const hooksSrc = join(TEMPLATES_DIR, 'hooks');
  const hooksDest = join(target, '.claude', 'hooks');
  copyDir(hooksSrc, hooksDest);
  const hookFiles = readdirSync(hooksSrc);
  for (const hook of hookFiles) {
    makeExecutable(join(hooksDest, hook));
  }
  updated += hookFiles.length;

  // 4. Write new version
  writeFileSync(join(target, '.frame', '.frame-version'), VERSION, 'utf-8');

  logSuccess(`Updated: ${updated} framework files`);

  log(`\nFRAME updated: v${installedVersion} → v${VERSION}\n`);
}
