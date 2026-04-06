# His Girl Friday Comprehension Golden Set

**DEV-ONLY fixtures. NEVER expose via any API route.** These tuples drive the
pre-pilot grader calibration (FND-03). Exposing them would let partners and
students game the grader (Pitfall 7 — grader mechanics partner-gaming).

## Contents

| File                          | Purpose                                                 |
| ----------------------------- | ------------------------------------------------------- |
| `his_girl_friday_rubric.md`   | Per-film rubric (D-05) used by every golden grader call |
| `his_girl_friday_tuples.json` | ≥50 hand-scored tuples spanning 10+ scenes, 4 bands     |
| `__init__.py`                 | Makes fixtures importable from tests                    |

## Score Bands (D-03)

| Score | Band | Category   |
| ----- | ---- | ---------- |
| 0     | low  | wrong      |
| 1     | low  | partial    |
| 2     | med  | right      |
| 3     | high | insightful |

## Authoring Protocol (D-19)

Every tuple MUST be authored via the dev+LLM-draft+dev-verify protocol:

1. **Dev selects** the scene and the concept being tested
2. **LLM drafts** a plausible student answer at the target band
3. **Dev verifies** the score by re-reading the rubric and confirming band assignment
4. **Document the verification** in the `notes` field

The `notes` field is MANDATORY — it is the verification audit trail.

## Adding New Tuples

1. Pick a scene from the 15 canonical scenes (or add a new one and update the count)
2. Write a 1-3 sentence `scene_context` that grounds the question without spoilers
3. Write a character-voice `question` (English only — MVP grader is English-only per PROJECT.md)
4. Draft a `student_answer` at the target band
5. Set `expected_score` (0-3) and matching `expected_band` (low/low/med/high)
6. List 2-4 substrings in `expected_rationale_contains` that a correct rationale should reference
7. Hand-verify against the rubric and document in `notes`
8. Assign the next sequential `tuple_id` (`hgf-NNN` zero-padded)

## Distribution Targets

- **≥50 total tuples**
- **All 4 band categories represented** (wrong, partial, right, insightful)
- **≥5 insightful tuples** — pilot teachers need to see the grader reward insight, not just correctness
- **≥10 distinct `scene_id` values** — broad scene coverage
- **No duplicate `(scene_id, student_answer)` pairs**

## Running the Harness

```bash
# CI default (recorded/mocked — no live API calls)
poetry run pytest tests/eval/test_grader_golden_set.py::test_grader_agreement_recorded -v -s

# Manual dev invocation against live Haiku API (opt-in)
poetry run pytest tests/eval/test_grader_golden_set.py::test_grader_agreement_live -m live -s
```

Phase 1 MEASURES agreement. Phase 4 PILOT-03 GATES at ≥85%.

## Security Notes

- These fixtures are DEV-ONLY and MUST NEVER be exposed via any API route
- Fixtures live under `tests/` and are not served by FastAPI
- If a future PR adds a route that loads this fixture file at runtime, reject it
- The rubric is read from the filesystem at test time only; production grader
  will receive the rubric via config/DB in a future phase
