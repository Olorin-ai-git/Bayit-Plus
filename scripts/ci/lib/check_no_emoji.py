#!/usr/bin/env python3
"""Fail if any tracked source file contains an emoji (Bayit+ platform rule).

git's bundled PCRE cannot match astral-plane code points, so the emoji gate is
implemented in Python where the full Unicode range is available.

Scans tracked files under the source trees, excluding JSON and locale data.
Prints violations as path:line:codepoint and exits non-zero if any are found.
"""
from __future__ import annotations

import subprocess
import sys

# Source trees to scan.
INCLUDE_PREFIXES = ("web/src/", "backend/app/", "shared/", "packages/")
# Paths to skip (data files where non-ASCII glyphs are legitimate).
EXCLUDE_SUBSTRINGS = ("/locales/", "/node_modules/")
EXCLUDE_SUFFIXES = (".json", ".lock", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".woff", ".woff2", ".ttf")


def is_emoji(cp: int) -> bool:
    return (
        0x1F000 <= cp <= 0x1FAFF      # symbols & pictographs, supplemental
        or 0x2600 <= cp <= 0x27BF     # misc symbols, dingbats
        or 0x2B00 <= cp <= 0x2BFF     # misc symbols and arrows
        or cp == 0xFE0F               # variation selector-16 (emoji presentation)
        or 0x1F1E6 <= cp <= 0x1F1FF   # regional indicators (flags)
        or 0x2190 <= cp <= 0x21FF and cp in (0x2194, 0x2195, 0x2196, 0x2197, 0x2198, 0x2199, 0x21A9, 0x21AA)
    )


def tracked_files() -> list[str]:
    out = subprocess.run(
        ["git", "ls-files", *INCLUDE_PREFIXES],
        capture_output=True, text=True, check=True,
    ).stdout
    files = []
    for path in out.splitlines():
        if any(s in path for s in EXCLUDE_SUBSTRINGS):
            continue
        if path.endswith(EXCLUDE_SUFFIXES):
            continue
        files.append(path)
    return files


def main() -> int:
    violations = []
    for path in tracked_files():
        try:
            with open(path, "r", encoding="utf-8") as fh:
                for lineno, line in enumerate(fh, 1):
                    for ch in line:
                        if is_emoji(ord(ch)):
                            violations.append(f"{path}:{lineno}: U+{ord(ch):04X} {ch!r}")
                            break
        except (UnicodeDecodeError, OSError):
            continue  # binary or unreadable; not a source-text concern

    if violations:
        print("Emoji found in source (platform rule: no emojis anywhere):")
        for v in violations[:100]:
            print(f"  {v}")
        if len(violations) > 100:
            print(f"  ... and {len(violations) - 100} more")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
