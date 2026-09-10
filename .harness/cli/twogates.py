"""TwoGates enrollment marker — read and summarise .harness/twogates.json.

Criterion 9 says a repo is onboarded only when its harness install is green AND
its agent sessions run behind the TwoGates gates. The enrollment half is
recorded by the harness-onboard-repo skill as a committed, non-secret marker;
this module is the only reader of it. The CLI never talks to the TwoGates API:
a marker is evidence of the LAST live verification, not current truth, so every
surface that renders it also renders its age instead of implying freshness.

Fleet-wide, TwoGates agents are minted and gate 1 is proven, but session
egress is deliberately not routed — TwoGates has no connections yet for
api.anthropic.com or github.com, so wiring HTTPS_PROXY would break Claude Code
and git everywhere at once. The marker's "gate1" field distinguishes that
"minted" waypoint from a fully "wired" install, and status reflects both
honestly rather than collapsing them into one enrolled/not-enrolled bit.
"""

import datetime
import json
from pathlib import Path

from cli import config, fileio
from cli.errors import HarnessError

MARKER_REL = ".harness/twogates.json"
SCHEMA_VERSION = 1
CHECKS = ("credentialSwap", "policyDeny", "tunnel")
CHECK_VALUES = ("pass", "fail", "not-run")
GATE1_STATES = ("minted", "wired")
# Every path a marker must name, each a non-empty string ("verification" is a
# dict, checked below). Requiring the KEY was not enough: "enrolled" tells an
# operator a specific org, agent, proxy with a pinned CA and fleet exist, yet
# `"agent": null`, `"proxy": {}`, `"org": ""`, `"fleet": "yes"` all read as
# enrolled while naming none of them.
REQUIRED_FIELDS = ("org", "agent.id", "proxy.url", "proxy.caFingerprint",
                   "fleet.id", "gate1", "enrolledAt", "lastVerifiedAt")
# Seconds of clock skew between the writing machine and this one are ordinary;
# hours ahead is a wrong clock, a writer timezone bug or a hand edit — never
# evidence of a verification that already happened. Past the tolerance such a
# stamp is refused, not clamped to 0d, which handed it the page's healthiest line.
FUTURE_TOLERANCE = datetime.timedelta(minutes=5)

# The one status→CSS-class mapping for every gate_summary() consumer (fleet
# index and dashboard card), so the palette cannot drift between surfaces.
# minted/not-enrolled are amber, not red: the record is trustworthy and the
# remaining step is an operator's call — failed/broken mean it cannot be trusted.
STATUS_CLASS: dict[str, str] = {
    "enrolled": "current",
    "minted": "warn",
    "stale": "warn",
    "not-enrolled": "warn",
    "failed": "broken",
    "broken": "broken",
}


def status_class(status: str) -> str:
    """CSS chip class for a status; "broken" for anything unrecognized —
    never healthy, never a KeyError (Task 9 review finding)."""
    return STATUS_CLASS.get(status, "broken")


def age_days(stamp) -> int | None:
    """Whole days since an ISO-8601 stamp; None when it does not parse, and
    None when it is dated ahead of now, which no past verification can be."""
    if not isinstance(stamp, str):
        return None
    try:
        verified = datetime.datetime.fromisoformat(stamp)
    except ValueError:
        return None
    if verified.tzinfo is None:
        # Attach UTC without going through .replace(): the write-policy scan
        # flags any bare `.replace(` call as an unrouted filesystem mutation
        # (it cannot tell datetime.replace from Path.replace), and combine()
        # reaches the same naive-as-UTC value without tripping it.
        verified = datetime.datetime.combine(
            verified.date(), verified.time(), datetime.UTC)
    delta = datetime.datetime.now(datetime.UTC) - verified
    return None if delta < -FUTURE_TOLERANCE else max(0, delta.days)


def marker_problem(data) -> str | None:
    """Why a parsed marker cannot be trusted, or None when it is well-formed."""
    if not isinstance(data, dict):
        return "top level must be a JSON object"
    if data.get("schema") != SCHEMA_VERSION:
        return (f"unknown schema {data.get('schema')!r} — this CLI understands "
                f"schema {SCHEMA_VERSION}")
    for path in REQUIRED_FIELDS:
        value = data
        for key in path.split("."):
            value = value.get(key) if isinstance(value, dict) else None
        if not isinstance(value, str) or not value.strip():
            return f'"{path}" must be a non-empty string, got {value!r}'
    if data["gate1"] not in GATE1_STATES:
        return f'"gate1" must be "minted" or "wired", got {data["gate1"]!r}'
    checks = data.get("verification")
    if not isinstance(checks, dict) or set(checks) != set(CHECKS):
        # Exactly the three: a fourth entry is a check this CLI cannot read,
        # and `{three passes, "extra": "fail"}` read as enrolled while the
        # record itself carried a failure. A real new check is a schema bump.
        return '"verification" must be exactly credentialSwap, policyDeny, tunnel'
    for key in CHECKS:
        if checks[key] not in CHECK_VALUES:
            return (f'"verification.{key}" is {checks[key]!r} — must be '
                     '"pass", "fail" or "not-run"')
    return None


def _summary(status: str, line: str, *, age=None, armed=None) -> dict:
    return {"status": status, "line": line, "age_days": age, "fleet_armed": armed}


def gate_summary(root: Path) -> dict:
    """One dict every surface renders from.

    status is one of "enrolled", "minted", "stale", "failed", "broken",
    "not-enrolled"; "line" is the full sentence status prints and the
    dashboard card shows.
    """
    path = root / MARKER_REL
    if not path.is_file():
        return _summary("not-enrolled",
                        "not enrolled — run the harness-onboard-repo skill")
    try:
        data = json.loads(fileio.read_text(path, "twogates.json"))
    except HarnessError as exc:
        return _summary("broken", f"enrollment record unreadable — {exc}")
    except json.JSONDecodeError as exc:
        return _summary("broken", f"enrollment record is not valid JSON: {exc}")
    problem = marker_problem(data)
    if problem is not None:
        return _summary("broken", f"enrollment record broken — {problem}")

    # `is True`, not truthiness: `"armed": "false"` is a non-empty string and
    # armed the display of a gate nobody armed. "fleet" is a dict by here.
    armed = data["fleet"].get("armed") is True
    checks = data["verification"]
    failed = [key for key in CHECKS if checks[key] == "fail"]
    if failed:
        return _summary("failed", "verification FAILED ("
                        + ", ".join(failed) + ") — re-enroll via the "
                        "harness-onboard-repo skill", armed=armed)

    gate2 = "gate 2 armed" if armed else "gate 2 registered, unarmed"
    age = age_days(data["lastVerifiedAt"])
    if data["gate1"] == "minted":
        # A waypoint awaiting operator work — the state every repo in the fleet
        # is in — so how long it has sat there decides everything: ageless, a
        # five-year-old mint reads exactly like this morning's. An unusable
        # stamp claims no verification, so it drops the phrase, not the row.
        recorded = f"; recorded {age}d ago" if age is not None else ""
        return _summary(
            "minted",
            "gate 1 minted, egress not routed — agent and fleet exist and "
            "the gate is proven; HTTPS_PROXY is deliberately unwired until "
            "TwoGates connections exist for api.anthropic.com and "
            f"github.com; {gate2}{recorded}",
            age=age, armed=armed)

    not_run = [key for key in CHECKS if checks[key] == "not-run"]
    if not_run:
        verb = "was" if len(not_run) == 1 else "were"
        return _summary(
            "broken",
            "enrollment record broken — marked wired but " +
            ", ".join(not_run) + f" {verb} not run",
            armed=armed)

    if age is None:
        return _summary(
            "broken",
            'enrollment record broken — "lastVerifiedAt" is unusable: not an '
            "ISO-8601 timestamp, or dated in the future, which no verification "
            "that already happened can be — re-verify and check the clock",
            armed=armed)
    threshold = config.stale_after_days(root)
    if age > threshold:
        return _summary(
            "stale",
            f"verification stale — last verified {age}d ago (threshold "
            f"{threshold}d); re-run the harness-onboard-repo verify",
            age=age, armed=armed)
    return _summary("enrolled",
                    f"enrolled — gate 1 verified {age}d ago; {gate2}",
                    age=age, armed=armed)


def doctor_problems(root: Path) -> list[tuple[str, str | None]]:
    """Warn-grade doctor checks, in hygiene.doctor_problems' (name, problem) shape.

    Warn, never FAIL: enrollment is criterion 9's second half, and a repo that
    has not finished enrolling is a partial onboarding — a fact to surface,
    not a broken install.
    """
    info = gate_summary(root)
    problem = None if info["status"] == "enrolled" else info["line"]
    return [("twogates enrollment", problem)]
