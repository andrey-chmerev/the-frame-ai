import { join, basename } from 'node:path';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { TEMPLATES_DIR, VERSION, log, logSuccess, logWarn, logError, detectProjectName } from './manifest.js';
import {
  ensureDir,
  copyDir,
  makeExecutable,
  fileExists,
  listFilesRecursive,
  writeFile,
  applyVars,
  mergeVscodeSettings,
} from './utils.js';
import { LANGUAGES, getLanguageInstruction, promptLanguage, promptConfig, promptCopilot } from './languages.js';
import { doctor } from './doctor.js';

const PLANNING_DIRS = [
  '.planning/memory',
  '.planning/pause-history',
  '.planning/reports/daily',
  '.planning/reports/deps',
  '.planning/reports/quality',
  '.planning/reports/sprint',
  '.planning/reports/cleanup',
  '.planning/reviews',
  '.planning/specs/archive',
  '.planning/forensics',
];

const CLAUDE_DIRS = [
  '.claude/commands',
  '.claude/agents',
  '.claude/hooks',
  '.claude/skills',
];

// Files in templates/project/ that should be mapped to root-level destinations
const ROOT_FILE_MAP = {
  'CLAUDE.md': 'CLAUDE.md',
  'settings.local.json': '.claude/settings.local.json',
  'config.json': '.frame/config.json',
  'STATE.md': '.planning/STATE.md',
  'MAP.md': '.planning/MAP.md',
};

const SKIP_PROJECT_FILES = new Set(['CONTEXT.md']);


export async function init(target, flags = {}) {
  if (fileExists(join(target, '.frame', 'config.json'))) {
    logWarn('FRAME already installed in this project.');
    log('Use `the-frame update` to update framework files.');
    return;
  }

  const projectName = detectProjectName(target);
  log(`\nFRAME v${VERSION} — Initializing in ${basename(target)}...\n`);

  const language = await promptLanguage(flags.lang, flags.yes);
  const langLabel = LANGUAGES.find((l) => l.code === language)?.name || language;
  logSuccess(`Language: ${langLabel}\n`);

  // 1. Create directories
  log('Creating directories...');
  for (const dir of [...CLAUDE_DIRS, ...PLANNING_DIRS]) {
    ensureDir(join(target, dir));
  }

  const defaultConfig = JSON.parse(readFileSync(join(TEMPLATES_DIR, 'project', 'config.json'), 'utf-8'));
  const resolvedConfig = await promptConfig(defaultConfig, flags.yes);
  const qualityVars = Object.fromEntries(
    Object.entries(resolvedConfig.quality.commands).map(([k, v]) => [`quality.commands.${k}`, v])
  );
  const vars = { PROJECT_NAME: projectName, LANGUAGE: language };

  // 2. Copy commands and apply quality.commands substitution
  const commandsSrc = join(TEMPLATES_DIR, 'commands');
  const commandsDest = join(target, '.claude', 'commands');
  copyDir(commandsSrc, commandsDest);
  for (const f of readdirSync(commandsDest).filter((f) => f.endsWith('.md'))) {
    const p = join(commandsDest, f);
    const replaced = applyVars(readFileSync(p, 'utf-8'), vars, qualityVars);
    writeFile(p, replaced);
  }
  const commandCount = readdirSync(commandsSrc).filter((f) => f.endsWith('.md')).length;
  logSuccess(`${commandCount} commands → .claude/commands/`);

  // 2b. Copilot Chat support
  const copilot = await promptCopilot(flags.yes);
  if (copilot) {
    const vscodeDest = join(target, '.vscode');
    ensureDir(vscodeDest);
    for (const f of readdirSync(commandsDest).filter((f) => f.endsWith('.md'))) {
      writeFile(join(vscodeDest, f.replace(/\.md$/, '.prompt.md')), readFileSync(join(commandsDest, f), 'utf-8'));
    }
    mergeVscodeSettings(join(vscodeDest, 'settings.json'));
    logSuccess(`${commandCount} Copilot prompts → .vscode/`);
  }

  // 3. Copy agents and apply quality.commands substitution
  const agentsSrc = join(TEMPLATES_DIR, 'agents');
  const agentsDest = join(target, '.claude', 'agents');
  copyDir(agentsSrc, agentsDest);
  for (const f of readdirSync(agentsDest).filter((f) => f.endsWith('.md'))) {
    const p = join(agentsDest, f);
    const replaced = applyVars(readFileSync(p, 'utf-8'), vars, qualityVars);
    writeFile(p, replaced);
  }
  const agentCount = readdirSync(agentsSrc).filter((f) => f.endsWith('.md')).length;
  logSuccess(`${agentCount} agents → .claude/agents/`);

  // 4. Copy hooks
  const hooksSrc = join(TEMPLATES_DIR, 'hooks');
  const hooksDest = join(target, '.claude', 'hooks');
  copyDir(hooksSrc, hooksDest);
  const hookFiles = readdirSync(hooksSrc);
  for (const hook of hookFiles) {
    makeExecutable(join(hooksDest, hook));
  }
  logSuccess(`${hookFiles.length} hooks → .claude/hooks/`);

  // 5. Copy planning templates
  const pauseStateSrc = join(TEMPLATES_DIR, 'planning', 'pause-state.json');
  if (fileExists(pauseStateSrc)) {
    writeFile(join(target, '.planning', 'pause-state.json'), readFileSync(pauseStateSrc, 'utf-8'));
  }

  // 6. Generate project-specific files
  const projectSrc = join(TEMPLATES_DIR, 'project');
  const projectFiles = listFilesRecursive(projectSrc);

  let fileCount = 0;
  for (const srcPath of projectFiles) {
    const relPath = srcPath.replace(projectSrc + '/', '');

    if (SKIP_PROJECT_FILES.has(relPath)) continue;

    // Determine destination
    let destPath;
    if (ROOT_FILE_MAP[relPath]) {
      destPath = join(target, ROOT_FILE_MAP[relPath]);
    } else {
      destPath = join(target, relPath);
    }

    ensureDir(join(destPath, '..'));
    const content = readFileSync(srcPath, 'utf-8');
    const replaced = applyVars(content, vars, qualityVars);
    writeFile(destPath, replaced);
    fileCount++;
  }

  // 7. Write version tracking
  writeFile(join(target, '.frame', '.frame-version'), VERSION);
  logSuccess(`${fileCount} project files generated`);
  logSuccess(`Version ${VERSION} recorded`);
  logSuccess(`Language: ${langLabel}`);

  // 8. Save resolved config (with user's stack choices + language)
  const configPath = join(target, '.frame', 'config.json');
  if (fileExists(configPath)) {
    resolvedConfig.language = language;
    resolvedConfig.copilot = copilot;
    writeFile(configPath, JSON.stringify(resolvedConfig, null, 2));
  }

  // 9. Inject language instruction into CLAUDE.md
  const claudeMdPath = join(target, 'CLAUDE.md');
  if (fileExists(claudeMdPath)) {
    const content = readFileSync(claudeMdPath, 'utf-8');
    writeFile(claudeMdPath, content + getLanguageInstruction(language));
  }

  // 10. Success
  log('\n' + '═'.repeat(60));
  log('  FRAME initialized successfully!');
  log('═'.repeat(60));
  log('');
  log(`  Commands:  ${commandCount} in .claude/commands/`);
  log(`  Agents:    ${agentCount} in .claude/agents/`);
  log(`  Hooks:     ${hookFiles.length} in .claude/hooks/`);
  log(`  Planning:  files in .planning/`);
  log(`  Config:    .frame/config.json`);
  if (copilot) log(`  Copilot:   ${commandCount} prompts in .vscode/`);
  log('');

  // 11. Auto-run doctor
  log('\n--- Проверка установки ---');
  await doctor(target);

  log('  Next steps:');
  log('    1. Open Claude Code in this project');
  log('    2. Run `/frame:init`  — scans codebase, fills MAP.md');
  log('    3. Run `/frame:daily` — your entry point every day');
  log('');
}
