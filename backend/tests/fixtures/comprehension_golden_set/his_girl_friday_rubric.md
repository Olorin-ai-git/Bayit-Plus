# His Girl Friday — Comprehension Rubric

**Film:** His Girl Friday (1940), dir. Howard Hawks
**Rubric scope:** Per-film (D-05). Applied to every comprehension turn scored against this film.
**Score range:** 0-3 (D-03) — 0=wrong, 1=partial, 2=right, 3=insightful
**Used by:** `app/services/olorin/comprehension/scorer.py` via `rubric_scoring_service.score(rubric=<this file's contents>, ...)`

## Concepts This Rubric Tests

1. **Character motivation** — Why characters act (especially Walter's manipulation, Hildy's ambivalence about leaving journalism)
2. **Subtext & manipulation** — What's said vs. what's meant; classic screwball-comedy dissonance between surface dialogue and underlying tactic
3. **Social commentary** — 1940s journalism ethics, gender dynamics, capital punishment, political corruption
4. **Narrative structure** — Cause/effect, escalation, reversal, the engagement that keeps getting postponed
5. **Dialogue craft** — Overlapping dialogue and rapid-fire delivery as a character device, not just a stylistic choice

## Score Band Definitions

### 0 — Wrong

Student answer misses the concept entirely, contradicts the scene, or applies a surface reading that ignores subtext. Indicators: takes dialogue at face value when the scene signals irony; attributes wrong motivation to a character; names the wrong character; confuses cause and effect; inverts the scene's meaning.

Example: "Walter lets Hildy go because he respects her choice." (Misses that Walter never stops scheming.)

### 1 — Partial

Student identifies part of the concept but misses key nuance. Indicators: names the right motivation but misses the manipulation layer; gets the what but not the why; correctly identifies one character's stake but ignores another's; surface-correct but thematically thin.

Example: "Walter wants Hildy to stay at the paper." (True but misses that he is actively sabotaging her engagement to keep her.)

### 2 — Right

Student correctly identifies the concept with appropriate nuance for the scene. Demonstrates understanding of both surface action and subtext. Names the key dynamic accurately. Does not need to connect outward to broader themes — scene-level understanding is enough.

Example: "Walter pretends to accept Hildy's retirement so she'll drop her guard while he sets up the Earl Williams story to pull her back in."

### 3 — Insightful

Student goes beyond the question, connecting the scene to a broader theme, character arc, or craft choice. Draws a link the question did not explicitly prompt. Names how the scene does its work, not just what happens in it.

Example: "Walter's calm is the whole joke — the film keeps staging his manipulations as workplace comedy so we root for the manipulator, which is Hawks letting the audience feel complicit in Hildy's return to journalism."

## Rationale Guidance for the Grader

- Rationale must cite the student's actual words or explicitly name what they missed
- Rationale is one sentence, ≤240 chars (matches the RubricScore schema `max_length=240`)
- Never reference prior turns or session history (D-10 stateless grader)
- Never reveal numeric score to the student (D-14) — rationale is for the teacher report
- Prefer concrete scene-anchored phrasing over abstract evaluation (say "missed Walter's scheming" not "incomplete analysis")
