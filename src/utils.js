import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  chmodSync,
} from 'node:fs';

import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

export function copyDir(src, dest) {
  cpSync(src, dest, { recursive: true });
}

export function writeFile(dest, content) {
  ensureDir(dirname(dest));
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

const JUNK_FILES = new Set(['.DS_Store', 'Thumbs.db', '.gitkeep']);

export function listFilesRecursive(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (JUNK_FILES.has(entry.name)) continue;
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

export function hashContent(content) {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

export function readManifest(manifestPath) {
  if (!existsSync(manifestPath)) return {};
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeManifest(manifestPath, manifest) {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

const PLAYWRIGHT_MCP = {
  command: 'npx',
  args: ['@playwright/mcp@latest'],
};

// Writes Playwright MCP to .mcp.json (project root) — the correct location for project MCPs
export function writeMcpConfig(mcpPath) {
  let config = {};
  if (existsSync(mcpPath)) {
    const raw = readFileSync(mcpPath, 'utf-8');
    try {
      config = JSON.parse(raw);
    } catch {
      process.stderr.write(`[FRAME] writeMcpConfig: could not parse ${mcpPath}, skipping merge\n`);
      return;
    }
  }
  config.mcpServers = config.mcpServers ?? {};
  config.mcpServers.playwright = PLAYWRIGHT_MCP;
  writeFileSync(mcpPath, JSON.stringify(config, null, 2), 'utf-8');
}

const FRAME_PERMISSIONS = [
  'Bash(npx tsc:*)',
  'Bash(npx vitest:*)',
  'Bash(npx eslint:*)',
  'WebSearch',
  'WebFetch',
];

const FRAME_HOOKS = {
  PreToolUse: [
    {
      matcher: 'Bash',
      hooks: [
        { type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/safety-net.sh"' },
        { type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/git-safety.sh"' },
      ],
    },
  ],
  PostToolUse: [
    {
      matcher: 'Write|Edit|NotebookEdit',
      hooks: [
        { type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/quality-gate.sh"', async: true },
      ],
    },
  ],
  PreCompact: [
    {
      hooks: [
        { type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/pre-compact.sh"' },
      ],
    },
  ],
  SessionStart: [
    {
      hooks: [
        { type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/session-init.sh"' },
      ],
    },
  ],
  Stop: [
    {
      hooks: [
        { type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/.claude/hooks/delivery-gate.sh"' },
      ],
    },
  ],
};

// Merges FRAME hooks and permissions into .claude/settings.json (shared, git-tracked)
export function mergeFrameSettings(settingsPath) {
  let settings = {};
  if (existsSync(settingsPath)) {
    const raw = readFileSync(settingsPath, 'utf-8');
    try {
      settings = JSON.parse(raw);
    } catch {
      // Unparseable settings.json — preserve file, skip merge to avoid data loss
      process.stderr.write(`[FRAME] mergeFrameSettings: could not parse ${settingsPath}, skipping merge\n`);
      return;
    }
  }
  settings.permissions = settings.permissions ?? {};
  settings.permissions.allow = settings.permissions.allow ?? [];
  for (const perm of FRAME_PERMISSIONS) {
    if (!settings.permissions.allow.includes(perm)) {
      settings.permissions.allow.push(perm);
    }
  }
  settings.hooks = FRAME_HOOKS;
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

