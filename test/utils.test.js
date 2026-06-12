import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  mergeFrameSettings,
  hashContent,
  readManifest,
  writeManifest,
  applyVars,
} from '../src/utils.js';

// ── hashContent ──────────────────────────────────────────────────────────────

test('hashContent returns a hex string of fixed length', () => {
  const h = hashContent('hello world');
  assert.match(h, /^[0-9a-f]{64}$/, 'SHA-256 hex should be 64 chars');
});

test('hashContent is deterministic', () => {
  assert.equal(hashContent('foo'), hashContent('foo'));
});

test('hashContent differs for different input', () => {
  assert.notEqual(hashContent('foo'), hashContent('bar'));
});

// ── readManifest / writeManifest ─────────────────────────────────────────────

test('readManifest returns {} when file does not exist', () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-utils-'));
  try {
    const result = readManifest(join(dir, 'manifest.json'));
    assert.deepEqual(result, {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readManifest returns {} on invalid JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-utils-'));
  try {
    const p = join(dir, 'manifest.json');
    writeFileSync(p, 'NOT JSON');
    const result = readManifest(p);
    assert.deepEqual(result, {});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeManifest + readManifest round-trips data', () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-utils-'));
  try {
    const p = join(dir, 'manifest.json');
    const data = { '.claude/commands/foo.md': 'abc123', '.claude/agents/bar.md': 'def456' };
    writeManifest(p, data);
    const result = readManifest(p);
    assert.deepEqual(result, data);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── applyVars ────────────────────────────────────────────────────────────────

test('applyVars replaces {{PLACEHOLDER}} with provided value', () => {
  const result = applyVars('Hello {{NAME}}!', { NAME: 'World' });
  assert.equal(result, 'Hello World!');
});

test('applyVars replaces multiple occurrences', () => {
  const result = applyVars('{{A}} and {{B}} and {{A}}', { A: 'foo', B: 'bar' });
  assert.equal(result, 'foo and bar and foo');
});

test('applyVars leaves unknown placeholders as empty string', () => {
  const result = applyVars('{{MISSING}}', {});
  assert.equal(result, '', 'unknown placeholder should become empty string');
});

test('applyVars replaces quality vars with {quality.commands.x} syntax', () => {
  const result = applyVars(
    'run: {quality.commands.typecheck}',
    {},
    { 'quality.commands.typecheck': 'tsc --noEmit' },
  );
  assert.equal(result, 'run: tsc --noEmit');
});

// ── mergeFrameSettings ───────────────────────────────────────────────────────

test('mergeFrameSettings creates settings.json when it does not exist', () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-utils-'));
  try {
    const p = join(dir, 'settings.json');
    mergeFrameSettings(p);
    assert.ok(existsSync(p), 'settings.json should have been created');
    const settings = JSON.parse(readFileSync(p, 'utf-8'));
    assert.ok(Array.isArray(settings.permissions?.allow), 'should have permissions.allow array');
    assert.ok(settings.permissions.allow.length > 0, 'should have at least one permission');
    assert.ok(settings.hooks, 'should have hooks');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mergeFrameSettings appends permissions to existing allow list', () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-utils-'));
  try {
    const p = join(dir, 'settings.json');
    writeFileSync(p, JSON.stringify({ permissions: { allow: ['Bash(git:*)'] } }));
    mergeFrameSettings(p);
    const settings = JSON.parse(readFileSync(p, 'utf-8'));
    assert.ok(settings.permissions.allow.includes('Bash(git:*)'), 'pre-existing permission should be preserved');
    assert.ok(settings.permissions.allow.includes('WebSearch'), 'FRAME WebSearch permission should be added');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mergeFrameSettings is idempotent (duplicate permissions not added)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-utils-'));
  try {
    const p = join(dir, 'settings.json');
    mergeFrameSettings(p);
    mergeFrameSettings(p);
    const settings = JSON.parse(readFileSync(p, 'utf-8'));
    const webSearchCount = settings.permissions.allow.filter((x) => x === 'WebSearch').length;
    assert.equal(webSearchCount, 1, 'WebSearch should appear exactly once after two merges');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mergeFrameSettings preserves file and skips when JSON is invalid', () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-utils-'));
  try {
    const p = join(dir, 'settings.json');
    writeFileSync(p, '// JSONC comment\n{ "key": 1 }');
    // Should not throw — just skip
    assert.doesNotThrow(() => mergeFrameSettings(p));
    // File content should be unchanged
    const raw = readFileSync(p, 'utf-8');
    assert.ok(raw.includes('JSONC comment'), 'invalid JSON file should be left untouched');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

