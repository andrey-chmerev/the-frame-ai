# /frame:doctor -- FRAME Health Check

Diagnoses all FRAME systems and outputs a report.

## Instructions

Run a full project diagnostics. Check each component:

### 1. Node.js version

```bash
node_version=$(node -e "process.exit(parseInt(process.versions.node) >= 18 ? 0 : 1)" 2>/dev/null && echo "OK" || echo "REQUIRES >=18")
echo "Node.js: $(node --version) — $node_version"
```

### 2. CLAUDE.md

```bash
if [ -f "CLAUDE.md" ]; then
  echo "CLAUDE.md: OK ($(grep -c "## " CLAUDE.md) sections)"
else
  echo "CLAUDE.md: MISSING"
fi
```

### 3. .planning/ structure

```bash
for file in STATE.md ROADMAP.md CONTEXT.md MAP.md; do
  if [ -f ".planning/$file" ]; then
    echo "$file: OK"
  else
    echo "$file: MISSING"
  fi
done
```

### 4. .planning/memory/

```bash
for file in context.md patterns.md conventions.md decisions.md anti-patterns.md wins.md metrics.md dependencies.md; do
  if [ -f ".planning/memory/$file" ]; then
    echo "$file: OK"
  else
    echo "$file: MISSING"
  fi
done

# Check patterns.md has required sections
if [ -f ".planning/memory/patterns.md" ]; then
  for section in "## Core" "## Active" "## Archived"; do
    if grep -q "^${section}$" .planning/memory/patterns.md; then
      echo "patterns.md section '${section}': OK"
    else
      echo "patterns.md section '${section}': MISSING"
    fi
  done
fi
```

### 5. .frame/config.json

```bash
if [ -f ".frame/config.json" ]; then
  if node -e "JSON.parse(require('fs').readFileSync('.frame/config.json','utf-8'))" 2>/dev/null; then
    echo "config.json: OK (language: $(node -e "console.log(JSON.parse(require('fs').readFileSync('.frame/config.json','utf-8')).language||'not set')"))"
  else
    echo "config.json: INVALID JSON"
  fi
else
  echo "config.json: MISSING"
fi
```

### 6. Settings

```bash
if [ -f ".claude/settings.local.json" ]; then
  echo "settings.local.json: OK"
  if grep -q "hooks" .claude/settings.local.json; then
    echo "  Hooks configured: OK"
  else
    echo "  Hooks configured: MISSING"
  fi
else
  echo "settings.local.json: MISSING"
fi
```

### 7. Commands

```bash
command_count=$(ls .claude/commands/frame:*.md 2>/dev/null | wc -l | tr -d ' ')
expected_count=$(ls .claude/commands/frame:*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$command_count" -ge 1 ]; then
  echo "Commands: $command_count — OK"
else
  echo "Commands: $command_count — INCOMPLETE (no commands found)"
fi
```

### 8. Agents

```bash
agent_count=$(ls .claude/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$agent_count" -ge 5 ]; then
  echo "Agents: $agent_count/5 — OK"
else
  echo "Agents: $agent_count/5 — INCOMPLETE"
fi
```

### 9. Hooks

```bash
for hook in safety-net.sh git-safety.sh quality-gate.sh session-init.sh; do
  if [ -f ".claude/hooks/$hook" ]; then
    if [ -x ".claude/hooks/$hook" ]; then
      echo "$hook: OK (executable)"
    else
      echo "$hook: WARNING — not executable (chmod +x needed)"
    fi
  else
    echo "$hook: MISSING"
  fi
done
```

### 10. Git

```bash
git_status=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
echo "Uncommitted changes: $git_status"
echo "Recent commits:"
git log --oneline -5 2>/dev/null
```

## Output Format

```
+======================================================================+
|                    FRAME DOCTOR REPORT                               |
+======================================================================+
|                                                                      |
|  Environment:                                                        |
|   Node.js            v20.x — OK                                     |
|                                                                      |
|  Core Files:                                                         |
|   CLAUDE.md          OK (N sections)                                 |
|   .planning/         OK (4/4 files)                                  |
|   .planning/memory/  OK (8/8 files)                                  |
|   .frame/config.json OK (language: en)                               |
|   settings.local.json OK                                             |
|                                                                      |
|  FRAME Components:                                                   |
|   Commands:          N — OK                                          |
|   Agents:            5/5  — OK                                       |
|   Hooks:             4/4  — OK                                       |
|                                                                      |
|  Git:                                                                |
|   Uncommitted:       N files                                         |
|                                                                      |
+======================================================================+
```

## Result

- Full FRAME diagnostics completed
- Problems identified
- Recommendations for fixes
