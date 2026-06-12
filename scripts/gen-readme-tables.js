#!/usr/bin/env node
// Generates command/agent tables for README.md from frontmatter.
// Usage: node scripts/gen-readme-tables.js [--check]
//   --check  exit 1 if README is out of date (for CI)

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHECK_ONLY = process.argv.includes('--check');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
    fm[key] = val;
  }
  return fm;
}

function buildCommandsTable() {
  const dir = join(ROOT, 'templates', 'commands');
  const rows = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.md')) continue;
    const content = readFileSync(join(dir, file), 'utf-8');
    const fm = parseFrontmatter(content);
    const name = `\`/${file.replace('.md', '')}\``;
    const desc = fm.description || '—';
    const hint = fm['argument-hint'] ? `\`${fm['argument-hint']}\`` : '—';
    rows.push(`| ${name} | ${desc} | ${hint} |`);
  }
  return [
    `| Command | Description | Arguments |`,
    `|---------|-------------|-----------|`,
    ...rows,
  ].join('\n');
}

function buildAgentsTable() {
  const dir = join(ROOT, 'templates', 'agents');
  const rows = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.md')) continue;
    const content = readFileSync(join(dir, file), 'utf-8');
    const fm = parseFrontmatter(content);
    const nameField = fm.name || file.replace('.md', '');
    const name = `\`${nameField}\``;
    const desc = fm.description || '—';
    rows.push(`| ${name} | ${desc} |`);
  }
  return [
    `| Agent | Description |`,
    `|-------|-------------|`,
    ...rows,
  ].join('\n');
}

function injectSection(readme, startMarker, endMarker, table) {
  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);
  if (startIdx < 0 || endIdx < 0) return null;
  return (
    readme.slice(0, startIdx + startMarker.length) +
    '\n' +
    table +
    '\n' +
    readme.slice(endIdx)
  );
}

const readmePath = join(ROOT, 'README.md');
if (!existsSync(readmePath)) {
  process.stderr.write('README.md not found\n');
  process.exit(1);
}

const original = readFileSync(readmePath, 'utf-8');

let updated = original;
updated = injectSection(
  updated,
  '<!-- COMMANDS:START -->',
  '<!-- COMMANDS:END -->',
  buildCommandsTable()
);
updated = injectSection(
  updated,
  '<!-- AGENTS:START -->',
  '<!-- AGENTS:END -->',
  buildAgentsTable()
);

if (updated === null) {
  process.stderr.write(
    'README.md is missing <!-- COMMANDS:START -->...<!-- COMMANDS:END --> or <!-- AGENTS:START -->...<!-- AGENTS:END --> markers.\n' +
    'Add them to README.md where you want the tables inserted.\n'
  );
  process.exit(1);
}

if (CHECK_ONLY) {
  if (updated !== original) {
    process.stderr.write('README.md tables are out of date. Run: node scripts/gen-readme-tables.js\n');
    process.exit(1);
  }
  process.stdout.write('README.md tables are up to date.\n');
  process.exit(0);
}

if (updated !== original) {
  writeFileSync(readmePath, updated, 'utf-8');
  const cmdCount = readdirSync(join(ROOT, 'templates', 'commands')).filter(f => f.endsWith('.md')).length;
  const agentCount = readdirSync(join(ROOT, 'templates', 'agents')).filter(f => f.endsWith('.md')).length;
  process.stdout.write(`README.md updated: ${cmdCount} commands, ${agentCount} agents.\n`);
} else {
  process.stdout.write('README.md tables already up to date.\n');
}
