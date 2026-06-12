import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';

function makeTmpGitRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'frame-test-'));
  mkdirSync(join(dir, '.git'));
  return dir;
}

// Run a full init with non-interactive flags (no stdin prompts)
async function runInit(dir) {
  process.env.FRAME_LANG = 'en';
  // promptConfig returns defaultConfig when stdin is not a TTY (CI/test env)
  const { init } = await import('../src/init.js?bust=' + Date.now());
  await init(dir, { lang: 'en' });
  delete process.env.FRAME_LANG;
}

test('init: already installed guard', async () => {
  const dir = makeTmpGitRepo();
  try {
    await runInit(dir);
    // Second run should bail out without throwing
    await runInit(dir);
    assert.ok(true, 'second init did not throw');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init: creates all required directories', async () => {
  const dir = makeTmpGitRepo();
  try {
    await runInit(dir);
    const required = [
      '.claude/commands',
      '.claude/agents',
      '.claude/hooks',
      '.planning/memory',
      '.planning/forensics',
      '.planning/pause-history',
      '.planning/reports/daily',
    ];
    for (const d of required) {
      assert.ok(existsSync(join(dir, d)), `${d} should exist`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init: copies commands and agents', async () => {
  const dir = makeTmpGitRepo();
  try {
    await runInit(dir);
    const commands = existsSync(join(dir, '.claude/commands'));
    const agents = existsSync(join(dir, '.claude/agents'));
    assert.ok(commands, '.claude/commands should exist');
    assert.ok(agents, '.claude/agents should exist');
    // At least one command file copied
    const { readdirSync } = await import('node:fs');
    const cmdFiles = readdirSync(join(dir, '.claude/commands')).filter(f => f.endsWith('.md'));
    assert.ok(cmdFiles.length > 0, 'commands directory should contain .md files');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init: generates config.json with project name', async () => {
  const dir = makeTmpGitRepo();
  try {
    await runInit(dir);
    const configPath = join(dir, '.frame/config.json');
    assert.ok(existsSync(configPath), '.frame/config.json should exist');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    assert.ok(config.quality?.commands?.typecheck, 'config should have typecheck command');
    assert.ok(config.language, 'config should have language field');
    assert.equal(typeof config.project, 'string', 'config.project should be a string');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init: generates CLAUDE.md with language instruction', async () => {
  const dir = makeTmpGitRepo();
  try {
    await runInit(dir);
    const claudeMd = join(dir, 'CLAUDE.md');
    assert.ok(existsSync(claudeMd), 'CLAUDE.md should exist');
    const content = readFileSync(claudeMd, 'utf-8');
    assert.ok(content.includes('Response Language'), 'CLAUDE.md should contain language instruction');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init: generates STATE.md and MAP.md', async () => {
  const dir = makeTmpGitRepo();
  try {
    await runInit(dir);
    assert.ok(existsSync(join(dir, '.planning/STATE.md')), 'STATE.md should exist');
    assert.ok(existsSync(join(dir, '.planning/MAP.md')), 'MAP.md should exist');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init: substitutes {{PROJECT_NAME}} in templates', async () => {
  const dir = makeTmpGitRepo();
  try {
    await runInit(dir);
    const claudeMd = readFileSync(join(dir, 'CLAUDE.md'), 'utf-8');
    assert.ok(!claudeMd.includes('{{PROJECT_NAME}}'), 'CLAUDE.md should not contain unresolved {{PROJECT_NAME}}');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('init: writes .frame-version file', async () => {
  const dir = makeTmpGitRepo();
  try {
    await runInit(dir);
    const versionFile = join(dir, '.frame/.frame-version');
    assert.ok(existsSync(versionFile), '.frame-version should exist');
    const version = readFileSync(versionFile, 'utf-8').trim();
    assert.match(version, /^\d+\.\d+\.\d+$/, '.frame-version should be semver');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
