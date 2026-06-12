---
title: Learnings
description: Project-specific patterns, anti-patterns, and architecture decisions discovered during development
retention: 20 items per section (archive older entries when limit reached)
---

# Learnings

<!-- Unified knowledge base: patterns, anti-patterns, and architecture decisions.
     Retention cap: 20 items per section. Archive oldest when full.
     Confidence/decay model: Core (high, 5+), Active (all others), Archived (low + >60 days inactive).
-->

## Patterns

<!-- Format for new entries:
### {Pattern Name} [confidence: {high|medium|low}, confirmed: {N}x, added: {date}, last: {date}]
- **Pattern**: {description}
- **Where**: {where it is used}
- **Convention**: {convention}
- **From**: {DEC-XXX or blank if organic}
- **Discovered**: {date}
-->

### Core

<!-- Established patterns: confidence: high (5+ confirmed)
     or confidence: medium with confirmed >= 3 and last within the last 90 days.
     Planner reads only this section. -->

### Active

<!-- Working patterns: all patterns not in Core.
     Marked [stale] if last > 90 days. -->

### Archived

<!-- Patterns with confidence: low, inactive for > 60 days. -->

---

## Anti-Patterns

<!-- Format for new entries:
### Anti-pattern: {name}
- **Why it is bad**: {reason}
- **Correct approach**: {how it should be done}
- **Related decision**: {DEC-XXX if avoided by a decision}
- **Occurrences**: {count}
-->

---

## Decisions

<!-- Format for new entries:
### [DEC-{XXX}] {Decision Title}
- **Date**: {date}
- **Status**: {accepted|deprecated|superseded by DEC-YYY}
- **Context**: {why this decision was needed}
- **Decision**: {what was decided}
- **Consequences**: {what follows from this decision}

Related:
- → derives: learnings.md#{pattern-name}
- → avoids: learnings.md#{anti-pattern-name}
- ← derived from: (if this supersedes another decision)

### Archived

(decisions older than 20 items are moved here by /frame:cleanup-memory)
-->
