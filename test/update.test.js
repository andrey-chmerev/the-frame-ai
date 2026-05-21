import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

function makeFakeInstall(dir) {
  mkdirSync(join(dir, '.git'));
  mkdirSync(join(dir, '.frame'), { recursive: true });
  mkdirSync(join(dir, '.claude', 'commands'), { recursive: true });
  mkdirSync(join(dir, '.claude', 'agents'), { recursive: true });
  mkdirSync(join(dir, '.claude', 'hooks'), { recursive: true });
  writeFileSync(join(dir, '.frame', 'config.json'), '{"language":"en"}');
  writeFileSync(join(dir, '.frame', '.frame-version'), '0.0.1');
  // Protected file with custom content
  writeFileSync(join(dir, '.frame', 'config.json'), '{"language":"ru","custom":true}');
}

test('update does not overwrite protected config.json', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-update-'));
  try {
    makeFakeInstall(dir);
    const { update } = await import('../src/update.js');
    await update(dir);
    const config = JSON.parse(readFileSync(join(dir, '.frame', 'config.json'), 'utf-8'));
    // config.json is in PROTECTED_FILES — update should not touch it
    assert.equal(config.custom, true, 'protected config.json must not be overwritten');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update fails gracefully when FRAME not installed', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-noinit-'));
  mkdirSync(join(dir, '.git'));
  try {
    const { update } = await import('../src/update.js');
    // Should not throw — just log error and return
    await assert.doesNotReject(() => update(dir));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
