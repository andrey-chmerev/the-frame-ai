import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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
    ['.claude/settings.local.json', '{}'],
    ['.planning/STATE.md', ''],
    ['.planning/MAP.md', ''],
    ['.planning/ROADMAP.md', ''],
    ['.planning/CONTEXT.md', ''],
    ['.planning/pause-state.json', '{}'],
  ];
  for (const [f, c] of files) writeFileSync(join(dir, f), c);

  const hooks = ['safety-net.sh', 'git-safety.sh', 'quality-gate.sh', 'session-init.sh'];
  for (const h of hooks) {
    const p = join(dir, '.claude', 'hooks', h);
    writeFileSync(p, '#!/bin/bash\nexit 0');
    chmodSync(p, 0o755);
  }
}

test('doctor detects missing required directory', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-doctor-'));
  try {
    makeHealthyInstall(dir);
    rmSync(join(dir, '.planning', 'memory'), { recursive: true });
    const { doctor } = await import('../src/doctor.js');
    // Should not throw — doctor reports errors but doesn't exit
    await assert.doesNotReject(() => doctor(dir));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor runs without errors on healthy install', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-doctor-ok-'));
  try {
    makeHealthyInstall(dir);
    const { doctor } = await import('../src/doctor.js');
    await assert.doesNotReject(() => doctor(dir));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
