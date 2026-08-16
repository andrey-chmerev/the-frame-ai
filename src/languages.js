import { createInterface } from 'node:readline';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

export const LANGUAGES = [
  { code: 'auto', name: 'Auto-detect', label: 'Auto-detect (mirror user language)' },
  { code: 'en', name: 'English', label: 'English' },
  { code: 'es', name: 'Español', label: 'Español (Spanish)' },
  { code: 'de', name: 'Deutsch', label: 'Deutsch (German)' },
  { code: 'ru', name: 'Russian', label: 'Русский (Russian)' },
  { code: 'zh', name: 'Chinese', label: '中文 (Chinese)' },
  { code: 'pt', name: 'Portuguese', label: 'Português (Portuguese)' },
];

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  de: 'German',
  ru: 'Russian',
  zh: 'Chinese',
  pt: 'Portuguese',
};

export function getLanguageInstruction(language) {
  if (language === 'auto') {
    return `
## Response Language

Respond in the same language the user writes in. Mirror their language automatically.
Always match the language of the current user message.
`;
  }

  const langName = LANGUAGE_NAMES[language] || language;
  return `
## Response Language

Always respond in ${langName}. Write all specs, plans, reports, comments, and generated files in ${langName}.
`;
}

export async function promptLanguage(langOverride, yes = false) {
  if (langOverride) return langOverride;
  if (process.env.FRAME_LANG) return process.env.FRAME_LANG;
  if (!process.stdin.isTTY || yes) return 'auto';

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const prompt = '\n? Select response language:\n\n';
  const options = LANGUAGES.map((l, i) => `  ${i + 1}) ${l.label}`).join('\n');
  const footer = `\n  Enter number [1-${LANGUAGES.length}], press Enter for auto, or type a code (e.g. 'ja', 'fr', 'ko'): `;

  const answer = (await ask(rl, prompt + options + footer)).trim();
  rl.close();

  if (answer === '' || answer === '1') return 'auto';

  const idx = parseInt(answer, 10) - 1;
  if (idx >= 0 && idx < LANGUAGES.length) return LANGUAGES[idx].code;

  const rl2 = createInterface({ input: process.stdin, output: process.stdout });
  const custom = (await ask(rl2, '  Enter custom language code (e.g., "ja", "ko", "fr"): ')).trim().toLowerCase();
  rl2.close();
  return custom || 'auto';
}

// Every preset defines the same six keys. `audit`/`outdated` used to be left at
// their npm defaults for non-npm stacks, so a Go or Rust project ran `npm audit`
// in /frame:audit and silently reported no vulnerabilities. An empty string means
// "no standard tool for this stack" — consumers must report that as unknown, not clean.
const STACK_PRESETS = {
  typescript: { typecheck: 'npx tsc --noEmit', test: 'npx vitest run', lint: 'npx eslint .', build: 'npm run build', audit: 'npm audit', outdated: 'npm outdated' },
  javascript: { typecheck: '', test: 'npx vitest run', lint: 'npx eslint .', build: 'npm run build', audit: 'npm audit', outdated: 'npm outdated' },
  python: { typecheck: 'mypy .', test: 'pytest', lint: 'ruff check .', build: '', audit: 'pip-audit', outdated: 'pip list --outdated' },
  go: { typecheck: 'go vet ./...', test: 'go test ./...', lint: 'golangci-lint run', build: 'go build ./...', audit: 'govulncheck ./...', outdated: 'go list -u -m all' },
  rust: { typecheck: 'cargo check', test: 'cargo test', lint: 'cargo clippy', build: 'cargo build', audit: 'cargo audit', outdated: 'cargo outdated' },
  // SwiftPM has no standard vulnerability scanner — audit stays empty on purpose.
  swift: { typecheck: 'swift build', test: 'swift test', lint: 'swiftlint lint --quiet', build: 'swift build -c release', audit: '', outdated: 'swift package update --dry-run' },
  // Xcode apps of any platform — the preset is about the build system, not iOS.
  // A full xcodebuild is far too slow for the post-edit quality gate (it runs after
  // every Edit/Write), so typecheck stays empty and the gate only lints; the build
  // itself runs in /frame:review and /frame:ship. `swift package` needs a
  // Package.swift, which an Xcode-managed project does not have.
  'swift-xcode': {
    typecheck: '',
    test: `xcodebuild test -scheme "{{SCHEME}}" -destination '{{DEST_TEST}}'`,
    lint: 'swiftlint lint --quiet',
    build: `xcodebuild build -scheme "{{SCHEME}}" -destination '{{DEST_BUILD}}'`,
    audit: '',
    outdated: '',
  },
};

export { STACK_PRESETS };

// Tests need a concrete simulator; builds take the generic destination. macOS runs
// on the host, so both are the same there.
export const XCODE_PLATFORMS = {
  ios: { label: 'iOS', test: 'platform=iOS Simulator,name=iPhone 16', build: 'generic/platform=iOS' },
  macos: { label: 'macOS', test: 'platform=macOS', build: 'platform=macOS' },
};

// Detect the stack from manifest files. Order matters: an .xcodeproj means an app
// target even when a Package.swift sits beside it, and a native manifest wins over
// package.json in mixed repos (a Go service with a JS frontend is still Go here).
export function detectStack(target) {
  const has = (f) => existsSync(join(target, f));
  let entries = [];
  try {
    entries = readdirSync(target);
  } catch {
    return null; // unreadable directory — no detection, caller keeps its default
  }

  const xcode = entries.find((e) => e.endsWith('.xcodeproj') || e.endsWith('.xcworkspace'));
  if (xcode) {
    // The scheme usually carries the project name; the user can still correct it.
    return {
      stack: 'swift-xcode',
      marker: xcode,
      scheme: basename(xcode).replace(/\.(xcodeproj|xcworkspace)$/, ''),
      platform: detectXcodePlatform(target, entries),
    };
  }
  if (has('Package.swift')) return { stack: 'swift', marker: 'Package.swift' };
  if (has('go.mod')) return { stack: 'go', marker: 'go.mod' };
  if (has('Cargo.toml')) return { stack: 'rust', marker: 'Cargo.toml' };
  for (const f of ['pyproject.toml', 'requirements.txt', 'setup.py', 'Pipfile']) {
    if (has(f)) return { stack: 'python', marker: f };
  }
  if (has('package.json')) {
    return has('tsconfig.json')
      ? { stack: 'typescript', marker: 'tsconfig.json' }
      : { stack: 'javascript', marker: 'package.json' };
  }
  return null;
}

// An .xcodeproj says nothing about the platform, and the destination differs:
// building a macOS app for `generic/platform=iOS` fails outright. SDKROOT in
// project.pbxproj carries the answer. A workspace keeps its targets in sibling
// .xcodeproj bundles, so fall back to whichever project is there.
function detectXcodePlatform(target, entries) {
  const proj = entries.find((e) => e.endsWith('.xcodeproj'));
  if (!proj) return null;
  let pbx = '';
  try {
    pbx = readFileSync(join(target, proj, 'project.pbxproj'), 'utf-8');
  } catch {
    return null; // unreadable — let the caller ask or default
  }
  // A cross-platform project lists both; iOS is the safer assumption there,
  // since a macOS-only app never mentions iphoneos.
  if (/SDKROOT\s*=\s*iphoneos/.test(pbx)) return 'ios';
  if (/SDKROOT\s*=\s*macosx/.test(pbx)) return 'macos';
  return null;
}

// Xcode presets carry {{SCHEME}} and destination placeholders — only the project knows these.
function fillXcodeVars(preset, { scheme, platform }) {
  const dest = XCODE_PLATFORMS[platform] ?? XCODE_PLATFORMS.ios;
  const filled = { ...preset };
  for (const key of Object.keys(filled)) {
    filled[key] = filled[key]
      .replaceAll('{{SCHEME}}', scheme)
      .replaceAll('{{DEST_TEST}}', dest.test)
      .replaceAll('{{DEST_BUILD}}', dest.build);
  }
  return filled;
}

export async function promptConfig(defaultConfig, yes = false, target = null) {
  const detected = target ? detectStack(target) : null;

  // Non-interactive (--yes / no TTY): without detection the npm defaults from
  // config.json used to survive into Go, Rust and Swift projects.
  if (!process.stdin.isTTY || yes) {
    if (!detected) return defaultConfig;
    const config = JSON.parse(JSON.stringify(defaultConfig));
    Object.assign(
      config.quality.commands,
      fillXcodeVars(STACK_PRESETS[detected.stack], { scheme: detected.scheme || 'MyApp', platform: detected.platform }),
    );
    const platform = detected.platform ? ` for ${XCODE_PLATFORMS[detected.platform].label}` : '';
    console.log(`\x1b[32m✓\x1b[0m Stack: ${detected.stack}${platform} (detected from ${detected.marker})`);
    return config;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const config = JSON.parse(JSON.stringify(defaultConfig));

  console.log('\n? Project stack:\n');
  const stacks = Object.keys(STACK_PRESETS);
  stacks.forEach((s, i) =>
    console.log(`  ${i + 1}) ${s}${s === detected?.stack ? `  ← detected from ${detected.marker}` : ''}`),
  );
  console.log(`  ${stacks.length + 1}) custom`);

  const defaultStack = detected?.stack ?? 'typescript';
  const stackAnswer = (await ask(rl, `\n  Enter number [1-${stacks.length + 1}] (or press Enter for ${defaultStack}): `)).trim();
  const stackIdx = stackAnswer === '' ? stacks.indexOf(defaultStack) : parseInt(stackAnswer, 10) - 1;

  if (stackIdx >= 0 && stackIdx < stacks.length) {
    let preset = { ...STACK_PRESETS[stacks[stackIdx]] };
    if (Object.values(preset).some((v) => v.includes('{{SCHEME}}'))) {
      const suggestedScheme = detected?.scheme || 'MyApp';
      const scheme = (await ask(rl, `\n  Xcode scheme name [${suggestedScheme}]: `)).trim() || suggestedScheme;

      // The destination is platform-specific: a macOS app cannot build for
      // generic/platform=iOS, and an iOS app cannot test on platform=macOS.
      const keys = Object.keys(XCODE_PLATFORMS);
      const suggestedPlatform = detected?.platform ?? 'ios';
      const options = keys.map((k) => (k === suggestedPlatform ? `${XCODE_PLATFORMS[k].label} (default)` : XCODE_PLATFORMS[k].label));
      const answer = (await ask(rl, `  Target platform — ${options.join(' / ')}: `)).trim().toLowerCase();
      const platform = keys.find((k) => k === answer || XCODE_PLATFORMS[k].label.toLowerCase() === answer) ?? suggestedPlatform;

      preset = fillXcodeVars(preset, { scheme, platform });
    }
    Object.assign(config.quality.commands, preset);
    console.log(`\x1b[32m✓\x1b[0m Stack: ${stacks[stackIdx]}`);
    console.log('');
    console.log('  Quality commands that will be used:');
    for (const [k, v] of Object.entries(config.quality.commands)) {
      if (v) console.log(`    ${k}: ${v}`);
    }
    const confirm = (await ask(rl, '\n  Looks good? [Y/n]: ')).trim().toLowerCase();
    if (confirm === 'n') {
      for (const key of ['typecheck', 'test', 'lint', 'build']) {
        const current = config.quality.commands[key];
        const val = (await ask(rl, `  ${key} command [${current}]: `)).trim();
        if (val) config.quality.commands[key] = val;
      }
    }
  } else if (stackIdx === stacks.length) {
    for (const key of ['typecheck', 'test', 'lint', 'build']) {
      const current = config.quality.commands[key];
      const val = (await ask(rl, `  ${key} command [${current}]: `)).trim();
      if (val) config.quality.commands[key] = val;
    }
  }

  rl.close();
  return config;
}

export async function promptFrontend(yes = false) {
  if (yes) return false;
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('\n? Is this a frontend project? Adds Playwright MCP for UI verification (y/N): ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}
