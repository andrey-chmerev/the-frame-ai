import { join } from 'node:path';
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { TEMPLATES_DIR, VERSION, log, logSuccess, logWarn, logError } from './manifest.js';
import { fileExists } from './utils.js';

const REQUIRED_DIRS = [
  '.claude/commands',
  '.claude/agents',
  '.claude/hooks',
  '.planning',
  '.planning/memory',
  '.frame',
];

const REQUIRED_FILES = [
  'CLAUDE.md',
  '.frame/config.json',
  '.frame/.frame-version',
  '.claude/settings.json',
  '.planning/STATE.md',
  '.planning/MAP.md',
];

// Derived from templates/hooks/ so new hooks are checked automatically
function getHookFiles() {
  const hooksDir = join(TEMPLATES_DIR, 'hooks');
  if (!fileExists(hooksDir)) {
    return [
      '.claude/hooks/safety-net.sh',
      '.claude/hooks/git-safety.sh',
      '.claude/hooks/quality-gate.sh',
      '.claude/hooks/session-init.sh',
    ];
  }
  return readdirSync(hooksDir)
    .filter((f) => f.endsWith('.sh'))
    .map((f) => `.claude/hooks/${f}`);
}

export async function doctor(target) {
  log('\nFRAME Doctor — Checking installation health...\n');

  let errors = 0;
  let warnings = 0;

  // Node version
  log('Node.js:');
  const [major] = process.versions.node.split('.').map(Number);
  if (major >= 18) {
    logSuccess(`  v${process.versions.node}`);
  } else {
    logError(`  v${process.versions.node} — requires >=18`);
    errors++;
  }

  // Directories
  log('\nDirectories:');
  for (const dir of REQUIRED_DIRS) {
    if (fileExists(join(target, dir))) {
      logSuccess(`  ${dir}/`);
    } else {
      logError(`  ${dir}/ — MISSING`);
      errors++;
    }
  }

  // Files
  log('\nFiles:');
  for (const file of REQUIRED_FILES) {
    if (fileExists(join(target, file))) {
      logSuccess(`  ${file}`);
    } else {
      logError(`  ${file} — MISSING`);
      errors++;
    }
  }

  // config.json validation
  const configPath = join(target, '.frame', 'config.json');
  if (fileExists(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config.language) {
        logSuccess(`  .frame/config.json — valid (language: ${config.language})`);
      } else {
        logWarn('  .frame/config.json — missing "language" field');
        warnings++;
      }
    } catch {
      logError('  .frame/config.json — invalid JSON');
      errors++;
    }
  }

  // Hooks executability
  log('\nHooks:');
  for (const hook of getHookFiles()) {
    const fullPath = join(target, hook);
    if (!fileExists(fullPath)) {
      logError(`  ${hook} — MISSING`);
      errors++;
      continue;
    }
    try {
      const isExec = (statSync(fullPath).mode & 0o111) !== 0;
      if (isExec) {
        logSuccess(`  ${hook} — executable`);
      } else {
        logWarn(`  ${hook} — not executable`);
        warnings++;
      }
    } catch {
      logWarn(`  ${hook} — cannot check permissions`);
      warnings++;
    }
  }

  // Version
  log('\nVersion:');
  const installedVersion = fileExists(join(target, '.frame', '.frame-version'))
    ? readFileSync(join(target, '.frame', '.frame-version'), 'utf-8').trim()
    : 'unknown';

  if (installedVersion === VERSION) {
    logSuccess(`  Installed: ${installedVersion} (latest)`);
  } else {
    logWarn(`  Installed: ${installedVersion}, CLI: ${VERSION} — run \`the-frame update\``);
    warnings++;
  }

  // Counts
  log('\nComponents:');
  const commandsDir = join(target, '.claude', 'commands');
  if (fileExists(commandsDir)) {
    const count = readdirSync(commandsDir).filter((f) => f.endsWith('.md')).length;
    const templateCommandsDir = join(TEMPLATES_DIR, 'commands');
    const expectedCount = fileExists(templateCommandsDir)
      ? readdirSync(templateCommandsDir).filter((f) => f.endsWith('.md')).length
      : count;
    if (count >= expectedCount) {
      logSuccess(`  Commands: ${count}/${expectedCount}`);
    } else {
      logWarn(`  Commands: ${count}/${expectedCount}`);
      warnings++;
    }
  }

  const agentsDir = join(target, '.claude', 'agents');
  if (fileExists(agentsDir)) {
    const count = readdirSync(agentsDir).filter((f) => f.endsWith('.md')).length;
    const templateAgentsDir = join(TEMPLATES_DIR, 'agents');
    const expectedAgents = fileExists(templateAgentsDir)
      ? readdirSync(templateAgentsDir).filter((f) => f.endsWith('.md')).length
      : count;
    if (count >= expectedAgents) {
      logSuccess(`  Agents: ${count}/${expectedAgents}`);
    } else {
      logWarn(`  Agents: ${count}/${expectedAgents}`);
      warnings++;
    }
  }

  // Summary
  log('\n' + '─'.repeat(50));
  if (errors === 0 && warnings === 0) {
    logSuccess('All checks passed! FRAME is healthy.');
  } else {
    if (errors > 0) logError(`${errors} error(s) found`);
    if (warnings > 0) logWarn(`${warnings} warning(s) found`);
  }
  log('');

  return { errors, warnings };
}
