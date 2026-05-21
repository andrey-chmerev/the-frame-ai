import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export const VERSION = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf-8')
).version;

export const TEMPLATES_DIR = join(ROOT, 'templates');

export function resolveTarget(args) {
  const target = args[0] || process.cwd();
  let dir = target;
  while (true) {
    if (existsSync(join(dir, '.git'))) return target;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  console.error(`Error: ${target} is not inside a git repository.`);
  console.error('FRAME requires git history for checkpoints and rollbacks.');
  console.error('Run: git init && git commit --allow-empty -m "init"');
  console.error('(The empty commit is needed so FRAME has a base point for checkpoints.)');
  process.exit(1);
}

export function detectProjectName(target) {
  const pkgPath = join(target, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) return pkg.name;
    } catch {}
  }
  return basename(target);
}

export function log(msg) {
  console.log(msg);
}

export function logSuccess(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

export function logWarn(msg) {
  console.log(`\x1b[33m⚠\x1b[0m ${msg}`);
}

export function logError(msg) {
  console.error(`\x1b[31m✗\x1b[0m ${msg}`);
}
