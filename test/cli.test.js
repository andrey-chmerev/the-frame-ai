import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Capture writes to process.stdout during a synchronous window.
function captureStdout() {
  const chunks = [];
  const original = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk) => { chunks.push(String(chunk)); return true; };
  const restore = () => { process.stdout.write = original; };
  return { chunks, restore };
}

test('CLI: version command prints version string', async () => {
  const { run } = await import('../src/cli.js');
  const { chunks, restore } = captureStdout();
  try {
    await run(['version']);
  } finally {
    restore();
  }
  const output = chunks.join('');
  assert.ok(output.includes('the-frame'), `expected "the-frame" in output, got: ${output}`);
  assert.match(output, /\d+\.\d+\.\d+/, 'output should contain a semver string');
});

test('CLI: --version flag also prints version', async () => {
  const { run } = await import('../src/cli.js?v=2');
  const { chunks, restore } = captureStdout();
  try {
    await run(['--version']);
  } finally {
    restore();
  }
  const output = chunks.join('');
  assert.ok(output.includes('the-frame'), `expected "the-frame" in output, got: ${output}`);
});

test('CLI: unknown command logs error message and calls process.exit(1)', async () => {
  const { run } = await import('../src/cli.js?v=3');
  const { chunks, restore } = captureStdout();

  // Intercept process.exit so the test process does not terminate
  const originalExit = process.exit;
  let exitCode = null;
  process.exit = (code) => { exitCode = code ?? 0; };

  try {
    await run(['not-a-real-command']);
  } finally {
    restore();
    process.exit = originalExit;
  }

  const output = chunks.join('');
  assert.ok(
    output.toLowerCase().includes('unknown') || output.toLowerCase().includes('not-a-real-command'),
    `expected error message for unknown command, got: ${output}`,
  );
  assert.equal(exitCode, 1, 'unknown command should call process.exit(1)');
});

test('CLI: no args prints help with known commands', async () => {
  const { run } = await import('../src/cli.js?v=4');
  const { chunks, restore } = captureStdout();
  try {
    await run([]);
  } finally {
    restore();
  }
  const output = chunks.join('');
  assert.ok(output.includes('init'), 'help output should mention init command');
  assert.ok(output.includes('doctor'), 'help output should mention doctor command');
});

test('CLI: --dry-run flag passes through without crash on uninitialised dir', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'frame-cli-dryrun-'));
  mkdirSync(join(dir, '.git'));
  const { run } = await import('../src/cli.js?v=5');
  const { chunks, restore } = captureStdout();
  try {
    await run(['update', '--dry-run', dir]);
  } finally {
    restore();
    rmSync(dir, { recursive: true, force: true });
  }
  // Either "not installed" message or dry-run output — either way no crash
  assert.ok(true, '--dry-run on uninitialised dir did not throw');
});
