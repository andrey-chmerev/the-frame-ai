import { createInterface } from 'node:readline';

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
  const footer = `\n  Enter number [1-${LANGUAGES.length}] (or press Enter for auto): `;

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

const STACK_PRESETS = {
  typescript: { typecheck: 'npx tsc --noEmit', test: 'npx vitest run', lint: 'npx eslint .', build: 'npm run build' },
  javascript: { typecheck: '', test: 'npx vitest run', lint: 'npx eslint .', build: 'npm run build' },
  python: { typecheck: 'mypy .', test: 'pytest', lint: 'ruff check .', build: '' },
  go: { typecheck: 'go vet ./...', test: 'go test ./...', lint: 'golangci-lint run', build: 'go build ./...' },
  rust: { typecheck: 'cargo check', test: 'cargo test', lint: 'cargo clippy', build: 'cargo build' },
};

const MODEL_DESCRIPTIONS = {
  opus: 'opus   — best quality, slower (recommended for architecture/security)',
  sonnet: 'sonnet — faster, good for most tasks',
};

export async function promptConfig(defaultConfig, yes = false) {
  if (!process.stdin.isTTY || yes) return defaultConfig;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const config = JSON.parse(JSON.stringify(defaultConfig));

  console.log('\n? Project stack:\n');
  const stacks = Object.keys(STACK_PRESETS);
  stacks.forEach((s, i) => console.log(`  ${i + 1}) ${s}`));
  console.log(`  ${stacks.length + 1}) custom`);

  const stackAnswer = (await ask(rl, `\n  Enter number [1-${stacks.length + 1}] (or press Enter for typescript): `)).trim();
  const stackIdx = parseInt(stackAnswer, 10) - 1;

  if (stackIdx >= 0 && stackIdx < stacks.length) {
    const preset = STACK_PRESETS[stacks[stackIdx]];
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

  console.log('\n? Preferred model for agents:\n');
  Object.values(MODEL_DESCRIPTIONS).forEach((d, i) => console.log(`  ${i + 1}) ${d}`));
  const modelAnswer = (await ask(rl, '\n  Enter number [1-2] (or press Enter for opus): ')).trim().toLowerCase();
  if (modelAnswer === '2' || modelAnswer === 'sonnet') {
    config.model = 'sonnet';
    console.log('\x1b[32m✓\x1b[0m Model preference: sonnet');
  } else {
    config.model = 'opus';
  }

  rl.close();
  return config;
}

export async function promptCopilot(yes = false) {
  if (!process.stdin.isTTY || yes) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('\n? Add GitHub Copilot Chat support? (y/N): ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
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
