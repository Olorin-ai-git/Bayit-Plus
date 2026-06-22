# Bayit+ CI / Tightening / Smoke Battery

A single, shared battery used by developers locally, by the SessionStart hook in
Claude Code web sessions, and by the `Full Battery` GitHub Actions workflow
(`.github/workflows/full-battery.yml`). Local and CI runs execute the same
scripts so behaviour stays identical.

## Entry points

| Command | What it does |
|---|---|
| `npm run ci:battery` | Full battery: tighten + backend + web + e2e + smoke |
| `npm run ci:tighten` | Static gates only (format / lint / types / platform rules) |
| `npm run ci:smoke` | Backend boot + `/health` and web build sanity |
| `scripts/ci/full-battery.sh tighten smoke` | Run selected phases only |
| `scripts/ci/full-battery.sh --list` | List available phases |

## Phases

- **tighten** - backend `black`/`isort`/`mypy`, JS `lint`/`type-check`, and
  platform-rule checks (no emojis anywhere, no stray `console.log` in `web/src`,
  secret scan when `gitleaks` is present).
- **backend** - `pytest` with coverage against a MongoDB instance.
- **web** - `jest` unit/integration suite.
- **e2e** - Playwright suite (advisory in CI until pointed at a running preview).
- **smoke** - boots the FastAPI app on port 8000 and polls `/health`; optionally
  runs the web production build (`SMOKE_BUILD=1`).

## Behaviour

Every phase is tolerant of a missing toolchain: if `poetry`, `node_modules`, or
a browser is not present, that step is **skipped** (reported, not failed), so the
battery is safe to run in partially-provisioned environments.

### Useful environment variables

| Var | Default | Effect |
|---|---|---|
| `STRICT` | `1` | `0` makes the run advisory (always exits 0) |
| `COV_FAIL_UNDER` | `80` | Backend coverage gate |
| `WEB_COVERAGE` | `0` | `1` runs web tests with `--coverage` |
| `SMOKE_BUILD` | `0` | `1` includes the slow web production build in smoke |
| `BACKEND_PORT` | `8000` | Port the smoke test boots the API on (platform rule: 8000) |
| `NO_COLOR` | unset | Disable ANSI colour |

## Files

```
scripts/ci/
  full-battery.sh        Orchestrator (phase selection + aggregate result)
  tighten.sh             Static quality gates
  smoke-test.sh          Boot/build smoke checks
  lib/common.sh          Shared logging + pass/fail accounting
  lib/check_no_emoji.py  Unicode-aware no-emoji gate (platform rule)
```
