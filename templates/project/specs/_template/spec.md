# spec.md — {{feature}}

## Overview
- Feature: (name)
- Status: DRAFT

## Problem
(what problem does this solve?)

## Solution
(how will we solve it?)

## API / Interface
(define endpoints, components, or interfaces)

## Data Model
(define data structures if applicable)

## Edge Cases
- (edge case 1)
- (edge case 2)

## Testing Strategy
- (how will we test this?)

## Evidence
<!-- MANDATORY. Proof that the RESULT is right as a user sees it — not "tests pass".
     Each item is concrete, reproducible, and checked by CONTENT (what the screen/output/file says),
     never by size, duration, exit code or a score alone.
     /frame:review collects every item into docs/specs/{feature}/evidence/ before the panel runs;
     an empty section means the plan is not ready. Prefix `manual:` for what only a human can check
     (video, audio, hardware) — those go to /frame:test-plan and must be confirmed before ship. -->
- E1. Screenshot of {screen} with {input data} → shows {exact text / element / state}
- E2. Output of `{command}` on {input} → contains {exact lines / values}
- E3. File `{out/path}` opens and contains {exact fields / fragment}
- E4. manual: {what a human verifies, and how}

## References
- (links to research, docs, examples)
