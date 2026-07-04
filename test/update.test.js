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
  // User-customised content. No manifest.json is present, so when update() runs
  // it will find no recorded installed-hash for this file and will skip overwriting
  // it (manifest-based protection: current hash != installed hash → skip unless --force).
  writeFileSync(join(dir, '.frame', 'config.json'), '{"language":"ru","custom":true}');
}

test('update does not overwrite protected config.json', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-update-'));
  try {
    makeFakeInstall(dir);
    const { update } = await import('../src/update.js');
    await update(dir);
    const config = JSON.parse(readFileSync(join(dir, '.frame', 'config.json'), 'utf-8'));
    // update() must not overwrite a user-modified file (manifest-hash protection)
    assert.equal(config.custom, true, 'user-modified config.json must not be overwritten');
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

test('update fails gracefully on malformed config.json', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-badjson-'));
  try {
    makeFakeInstall(dir);
    writeFileSync(join(dir, '.frame', 'config.json'), '{"language": "en", // broken');
    const { update } = await import('../src/update.js?v=2');
    // Must not throw — log a readable error and return without touching files
    await assert.doesNotReject(() => update(dir));
    // config.json must be left as-is for the user to fix
    const raw = readFileSync(join(dir, '.frame', 'config.json'), 'utf-8');
    assert.ok(raw.includes('// broken'), 'malformed config.json must not be overwritten');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
