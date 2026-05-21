import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  chmodSync,
} from 'node:fs';
import { join } from 'node:path';

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

export function copyDir(src, dest) {
  cpSync(src, dest, { recursive: true });
}

export function writeFile(dest, content) {
  const dir = join(dest, '..');
  ensureDir(dir);
  writeFileSync(dest, content, 'utf-8');
}

export function applyVars(content, vars, qualityVars = {}) {
  let result = content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in vars)) process.stderr.write(`[FRAME] applyVars: unknown placeholder {{${key}}}\n`);
    return vars[key] ?? '';
  });
  result = result.replace(/\{(quality\.commands\.\w+)\}/g, (match, key) => qualityVars[key] ?? match);
  return result;
}


export function makeExecutable(filePath) {
  chmodSync(filePath, 0o755);
}

export function listFilesRecursive(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

export function fileExists(path) {
  return existsSync(path);
}
