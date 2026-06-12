import { VERSION, log } from './manifest.js';
import { resolveTarget } from './manifest.js';
import { init } from './init.js';
import { update } from './update.js';
import { doctor } from './doctor.js';

const HELP = `
FRAME — Framework for AI-Assisted Solo Development v${VERSION}

Usage:
  the-frame-ai init [target-dir]     Install FRAME into a project
  the-frame-ai update [target-dir]   Update FRAME files in a project
  the-frame-ai doctor [target-dir]   Check FRAME installation health
  the-frame-ai version               Show CLI version
  the-frame-ai help                  Show this help message

Options:
  --lang <code>   Set response language (e.g. en, ru, zh). Overrides FRAME_LANG env var.
  --dry-run       (update only) Show what would be updated without making changes.
  --copilot       (update only) Enable GitHub Copilot Chat support (adds .vscode/*.prompt.md).

Examples:
  npx the-frame-ai init              Install in current directory
  npx the-frame-ai init ../my-app    Install in specific directory
  npx the-frame-ai init --lang ru    Install with Russian language preset
  npx the-frame-ai update            Update in current directory
  npx the-frame-ai update --dry-run  Preview update without applying
  npx the-frame-ai update --copilot  Enable Copilot Chat support on existing install
  npx the-frame-ai doctor            Check health in current directory
`;

function parseFlags(args) {
  const flags = { lang: null, dryRun: false, yes: false, copilot: false };
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang' && args[i + 1]) {
      flags.lang = args[++i];
    } else if (args[i] === '--dry-run') {
      flags.dryRun = true;
    } else if (args[i] === '--yes' || args[i] === '-y') {
      flags.yes = true;
    } else if (args[i] === '--copilot') {
      flags.copilot = true;
    } else {
      rest.push(args[i]);
    }
  }
  return { flags, rest };
}

export async function run(args) {
  const [command, ...rest] = args;

  switch (command) {
    case 'init': {
      const { flags, rest: r } = parseFlags(rest);
      const target = resolveTarget(r);
      await init(target, flags);
      break;
    }
    case 'update': {
      const { flags, rest: r } = parseFlags(rest);
      const target = resolveTarget(r);
      await update(target, flags);
      break;
    }
    case 'doctor': {
      const target = resolveTarget(rest);
      await doctor(target);
      break;
    }
    case 'version':
    case '--version':
    case '-v':
      log(`the-frame v${VERSION}`);
      break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      log(HELP);
      break;
    default:
      log(`Unknown command: ${command}`);
      log(HELP);
      process.exit(1);
  }
}
