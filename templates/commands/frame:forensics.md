# /frame:forensics -- Deep Debugging

Systematic root cause analysis with logs, git history, and monitoring.

> Use when `frame:debug` hasn't found the cause in 30 minutes, or the problem is systemic/recurring.

## Instructions

Debug the problem deeply: **$ARGUMENTS**

### Step 0: Initialize

Write to `STATE.md`:
```markdown
- Phase: FORENSICS
- Issue: {description from $ARGUMENTS}
- Status: IN_PROGRESS
- Started: {timestamp}
```

Check memory before any investigation:
- `memory/anti-patterns.md` → similar symptom may have been investigated before
- `memory/decisions.md` → does the problem contradict an accepted decision

### Phase 1: Evidence Collection

1. **Git History**
   ```bash
   git log --oneline -20
   git log --all --oneline --graph | head -30
   git blame {affected_file}
   git diff {suspect_commit}^ {suspect_commit}
   ```

2. **Monitoring Logs (if available)**
   - What errors appeared recently?
   - What is the stack trace?
   - What triggers the error?

3. **Codebase**
   ```bash
   grep -r "{error_keyword}" --include="*.ts" --include="*.tsx" | head -20
   find . -name "*{affected_file}*"
   ```

### Phase 2: Root Cause Analysis (D→P→D)

Apply "5 Whys" — confirm each answer with a deterministic step:

1. What broke? **[D]** reproduce / find in logs
2. Why? → **[P]** hypothesis → **[D]** confirm with grep/test
3. Why did that happen? → **[P]** hypothesis → **[D]** confirm
4. Why was the implementation like that? → **[P]** hypothesis → **[D]** confirm
5. Why was it not prevented? → **[P]** hypothesis → **[D]** confirm

> Root cause is a confirmed fact, not a guess.

### Phase 3: Timeline Reconstruction

```
T-N days: commit X (possible cause)
T-3 days: first occurrence of error
T-2 days: commit Y (attempted fix)
T-1 day: error worsened
T-0: now (incident)
```

### Phase 4: Create Report

Create `.planning/forensics/{issue-id}.md`:

```markdown
# Forensic Report: {Issue}

## Incident Summary
{What happened, when, impact, who is affected}

## Root Cause
{5 Whys analysis with confirmed facts}

## Timeline
|T|Event|
|---|---|
|...|...|

## Evidence
### Git History
{relevant commits}

### Code Analysis
{problematic code}

### Related Issues
{monitoring links, PRs}

## Fix
{What needs to be fixed}

## Prevention
{How to avoid this in the future}
```

### Phase 5: Update Memory

**anti-patterns.md** — if a new anti-pattern was found:
```markdown
## Anti-pattern: {name}
- **Why it's bad**: {reason}
- **Correct approach**: {how to do it}
- **Related decision**: {DEC-XXX or empty}
- **Occurrences**: 1
```

**decisions.md** — if an architectural decision is needed:
```markdown
## [DEC-{XXX}] {Title}
- **Date**: {date}
- **Status**: accepted
- **Context**: {why the decision was needed}
- **Decision**: {what was decided}
- **Consequences**: {what follows from this}
```

**Update STATE.md**:
```markdown
- Phase: FORENSICS
- Issue: {issue}
- Status: COMPLETED
```

Then run `/frame:retrospective` to capture lessons learned.

## Result

- Root cause identified and confirmed deterministically
- Report created in `.planning/forensics/`
- Timeline reconstructed
- Memory updated (anti-patterns.md / decisions.md)
- STATE.md updated
