import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, chmodSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mirror doctor.js: the expected hook set is whatever ships in templates/hooks/
const TEMPLATE_HOOKS = readdirSync(new URL('../templates/hooks', import.meta.url))
  .filter((f) => f.endsWith('.sh'));

function makeHealthyInstall(dir) {
  const dirs = [
    '.claude/commands', '.claude/agents', '.claude/hooks', '.claude/skills',
    '.planning/memory', '.frame',
  ];
  for (const d of dirs) mkdirSync(join(dir, d), { recursive: true });

  const files = [
    ['CLAUDE.md', '# test'],
    ['.frame/config.json', '{"language":"en"}'],
    ['.frame/.frame-version', '0.1.0'],
    // doctor.js checks for .claude/settings.json (not settings.local.json)
    ['.claude/settings.json', '{}'],
    ['.planning/STATE.md', ''],
    ['.planning/MAP.md', ''],
  ];
  for (const [f, c] of files) writeFileSync(join(dir, f), c);

  for (const h of TEMPLATE_HOOKS) {
    const p = join(dir, '.claude', 'hooks', h);
    writeFileSync(p, '#!/bin/bash\nexit 0');
    chmodSync(p, 0o755);
  }
}

test('doctor reports errors when required directory is missing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-doctor-'));
  try {
    makeHealthyInstall(dir);
    rmSync(join(dir, '.planning', 'memory'), { recursive: true });
    const { doctor } = await import('../src/doctor.js');
    const result = await doctor(dir);
    assert.ok(result.errors > 0, `expected at least one error, got ${result.errors}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor reports errors when required file is missing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-doctor-missing-file-'));
  try {
    makeHealthyInstall(dir);
    rmSync(join(dir, '.claude', 'settings.json'));
    const { doctor } = await import('../src/doctor.js?v=2');
    const result = await doctor(dir);
    assert.ok(result.errors > 0, `expected at least one error when settings.json is missing, got ${result.errors}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor returns zero errors on healthy install', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-doctor-ok-'));
  try {
    makeHealthyInstall(dir);
    const { doctor } = await import('../src/doctor.js?v=3');
    const result = await doctor(dir);
    assert.equal(result.errors, 0, `expected 0 errors, got ${result.errors}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor reports errors when a hook from templates/hooks is missing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-doctor-hook-'));
  try {
    makeHealthyInstall(dir);
    // Remove the newest hook — a hardcoded doctor list would miss this
    rmSync(join(dir, '.claude', 'hooks', 'pre-compact.sh'));
    const { doctor } = await import('../src/doctor.js?v=5');
    const result = await doctor(dir);
    assert.ok(result.errors > 0, `expected an error for a missing templates-listed hook, got ${result.errors}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor result has warnings property', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-doctor-warnings-'));
  try {
    makeHealthyInstall(dir);
    const { doctor } = await import('../src/doctor.js?v=4');
    const result = await doctor(dir);
    assert.ok(typeof result.warnings === 'number', 'result.warnings should be a number');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
