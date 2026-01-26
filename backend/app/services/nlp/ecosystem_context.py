"""
Ecosystem Context Provider

Gathers dynamic context about the Olorin ecosystem for agent prompts:
- Git state (branch, uncommitted changes, recent commits)
- Available scripts by category
- Database content statistics
"""

import asyncio
import logging
import re
import subprocess
from dataclasses import dataclass, field
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class GitContext:
    """Git repository state."""

    branch: str = ""
    uncommitted_changes: List[str] = field(default_factory=list)
    recent_commits: List[Dict[str, str]] = field(default_factory=list)
    upstream_status: str = ""
    is_clean: bool = True

    @classmethod
    def empty(cls) -> "GitContext":
        """Return empty context for error cases."""
        return cls()

    def to_prompt_section(self) -> str:
        """Format as prompt section."""
        if not self.branch:
            return "Git context unavailable"

        lines = [
            f"Branch: {self.branch}",
            f"Status: {'Clean' if self.is_clean else 'Has uncommitted changes'}",
        ]

        if self.upstream_status:
            lines.append(f"Upstream: {self.upstream_status}")

        if self.uncommitted_changes:
            lines.append(f"Changed files ({len(self.uncommitted_changes)}):")
            for change in self.uncommitted_changes[:5]:
                lines.append(f"  - {change}")
            if len(self.uncommitted_changes) > 5:
                lines.append(f"  ... and {len(self.uncommitted_changes) - 5} more")

        if self.recent_commits:
            lines.append(f"Recent commits ({len(self.recent_commits)}):")
            for commit in self.recent_commits[:3]:
                lines.append(f"  - {commit['hash'][:7]} {commit['message']}")

        return "\n".join(lines)


@dataclass
class ScriptsContext:
    """Available scripts organized by category."""

    categories: Dict[str, List[Dict[str, str]]] = field(default_factory=dict)

    @classmethod
    def empty(cls) -> "ScriptsContext":
        """Return empty context for error cases."""
        return cls()

    def to_prompt_section(self) -> str:
        """Format as prompt section."""
        if not self.categories:
            return "Scripts context unavailable"

        lines = ["Available scripts by category:"]
        for category, scripts in self.categories.items():
            lines.append(f"\n{category.upper()}:")
            for script in scripts[:5]:
                lines.append(f"  - {script['name']}: {script.get('description', '')}")
            if len(scripts) > 5:
                lines.append(f"  ... and {len(scripts) - 5} more")

        return "\n".join(lines)


@dataclass
class DatabaseContext:
    """Database content statistics."""

    content_counts: Dict[str, int] = field(default_factory=dict)
    recent_additions: List[Dict[str, Any]] = field(default_factory=list)
    total_content: int = 0

    @classmethod
    def empty(cls) -> "DatabaseContext":
        """Return empty context for error cases."""
        return cls()

    def to_prompt_section(self) -> str:
        """Format as prompt section."""
        if not self.content_counts:
            return "Database context unavailable"

        lines = [f"Total content items: {self.total_content}", "By type:"]
        for content_type, count in self.content_counts.items():
            lines.append(f"  - {content_type}: {count}")

        if self.recent_additions:
            lines.append("\nRecent additions:")
            for item in self.recent_additions[:3]:
                lines.append(f"  - {item.get('title', 'Unknown')} ({item.get('type', '')})")

        return "\n".join(lines)


@dataclass
class EcosystemContext:
    """Complete ecosystem context for agent prompts."""

    git: GitContext
    scripts: ScriptsContext
    database: DatabaseContext
    platform: str = "bayit"
    gathered_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_prompt_section(self) -> str:
        """Format complete context as prompt section."""
        sections = [
            "## DYNAMIC ECOSYSTEM CONTEXT",
            f"Platform: {self.platform}",
            f"Context gathered: {self.gathered_at.isoformat()}",
            "",
            "### Git Repository",
            self.git.to_prompt_section(),
            "",
            "### Available Scripts",
            self.scripts.to_prompt_section(),
            "",
            "### Database Statistics",
            self.database.to_prompt_section(),
        ]
        return "\n".join(sections)


class EcosystemContextProvider:
    """
    Gathers dynamic ecosystem context for agent prompts.

    Context is gathered lazily and cached with configurable TTL.
    All context gathering operations handle failures gracefully.
    """

    def __init__(self, repo_root: Optional[Path] = None):
        """Initialize provider with repository root path."""
        self.repo_root = repo_root or self._find_repo_root()
        self._cache: Dict[str, Any] = {}
        self._cache_times: Dict[str, datetime] = {}

    async def get_full_context(self, platform: str = "bayit") -> EcosystemContext:
        """
        Gather all context components in parallel.

        Handles partial failures gracefully - if one component fails,
        others still return valid data.
        """
        results = await asyncio.gather(
            self._get_git_context(),
            self._get_scripts_context(),
            self._get_database_context(platform),
            return_exceptions=True,
        )

        git_ctx = results[0] if not isinstance(results[0], Exception) else GitContext.empty()
        scripts_ctx = (
            results[1] if not isinstance(results[1], Exception) else ScriptsContext.empty()
        )
        db_ctx = results[2] if not isinstance(results[2], Exception) else DatabaseContext.empty()

        if isinstance(results[0], Exception):
            logger.warning(f"Git context gathering failed: {results[0]}")
        if isinstance(results[1], Exception):
            logger.warning(f"Scripts context gathering failed: {results[1]}")
        if isinstance(results[2], Exception):
            logger.warning(f"Database context gathering failed: {results[2]}")

        return EcosystemContext(git=git_ctx, scripts=scripts_ctx, database=db_ctx, platform=platform)

    async def _get_git_context(self) -> GitContext:
        """Gather git repository state."""
        cache_key = "git_context"
        if self._is_cache_valid(cache_key, settings.NLP_GIT_CONTEXT_CACHE_TTL_SECONDS):
            return self._cache[cache_key]

        context = await asyncio.to_thread(self._gather_git_context_sync)
        self._cache[cache_key] = context
        self._cache_times[cache_key] = datetime.now(timezone.utc)
        return context

    def _gather_git_context_sync(self) -> GitContext:
        """Synchronous git context gathering."""
        try:
            branch = self._run_git_command(["git", "rev-parse", "--abbrev-ref", "HEAD"])
            status_output = self._run_git_command(["git", "status", "--porcelain"])
            uncommitted = [line for line in status_output.split("\n") if line.strip()]

            log_output = self._run_git_command(
                [
                    "git",
                    "log",
                    f"-{settings.NLP_GIT_CONTEXT_MAX_COMMITS}",
                    "--oneline",
                    "--no-decorate",
                ]
            )
            recent_commits = []
            for line in log_output.split("\n"):
                if line.strip():
                    parts = line.split(" ", 1)
                    if len(parts) >= 2:
                        recent_commits.append({"hash": parts[0], "message": parts[1]})

            upstream_status = ""
            try:
                ahead_behind = self._run_git_command(
                    ["git", "rev-list", "--left-right", "--count", "@{u}...HEAD"]
                )
                if ahead_behind:
                    parts = ahead_behind.split()
                    if len(parts) == 2:
                        behind, ahead = int(parts[0]), int(parts[1])
                        if ahead > 0 and behind > 0:
                            upstream_status = f"{ahead} ahead, {behind} behind upstream"
                        elif ahead > 0:
                            upstream_status = f"{ahead} commits ahead of upstream"
                        elif behind > 0:
                            upstream_status = f"{behind} commits behind upstream"
                        else:
                            upstream_status = "Up to date with upstream"
            except subprocess.CalledProcessError:
                upstream_status = "No upstream configured"

            return GitContext(
                branch=branch.strip(),
                uncommitted_changes=uncommitted,
                recent_commits=recent_commits,
                upstream_status=upstream_status,
                is_clean=len(uncommitted) == 0,
            )
        except Exception as e:
            logger.error(f"Failed to gather git context: {e}")
            return GitContext.empty()

    def _run_git_command(self, cmd: List[str]) -> str:
        """Run git command and return sanitized output."""
        result = subprocess.run(
            cmd,
            cwd=self.repo_root,
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            raise subprocess.CalledProcessError(result.returncode, cmd, result.stderr)
        return self._sanitize_output(result.stdout)

    async def _get_scripts_context(self) -> ScriptsContext:
        """Gather available scripts organized by category."""
        cache_key = "scripts_context"
        if self._is_cache_valid(cache_key, settings.NLP_ECOSYSTEM_CONTEXT_CACHE_TTL_SECONDS):
            return self._cache[cache_key]

        context = await asyncio.to_thread(self._gather_scripts_context_sync)
        self._cache[cache_key] = context
        self._cache_times[cache_key] = datetime.now(timezone.utc)
        return context

    def _gather_scripts_context_sync(self) -> ScriptsContext:
        """Synchronous scripts context gathering."""
        scripts_dir = self.repo_root / "scripts"
        if not scripts_dir.exists():
            return ScriptsContext.empty()

        categories: Dict[str, List[Dict[str, str]]] = {}

        category_dirs = ["backend", "web", "mobile", "infrastructure", "shared"]
        for category in category_dirs:
            category_path = scripts_dir / category
            if not category_path.exists():
                continue

            scripts = []
            for script_file in category_path.rglob("*.sh"):
                scripts.append(
                    {
                        "name": str(script_file.relative_to(scripts_dir)),
                        "description": self._extract_script_description(script_file),
                    }
                )
            for script_file in category_path.rglob("*.py"):
                scripts.append(
                    {
                        "name": str(script_file.relative_to(scripts_dir)),
                        "description": self._extract_script_description(script_file),
                    }
                )

            if scripts:
                categories[category] = scripts[:10]

        return ScriptsContext(categories=categories)

    def _extract_script_description(self, script_path: Path) -> str:
        """Extract first line of description from script."""
        try:
            with open(script_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("#") and not line.startswith("#!"):
                        desc = line.lstrip("#").strip()
                        if desc:
                            return desc[:80]
                    elif line and not line.startswith("#"):
                        break
            return ""
        except Exception:
            return ""

    async def _get_database_context(self, platform: str) -> DatabaseContext:
        """Gather database content statistics."""
        cache_key = f"database_context_{platform}"
        if self._is_cache_valid(cache_key, settings.NLP_ECOSYSTEM_CONTEXT_CACHE_TTL_SECONDS):
            return self._cache[cache_key]

        try:
            from app.models.content import Content

            content_counts: Dict[str, int] = {}

            pipeline = [{"$group": {"_id": "$content_type", "count": {"$sum": 1}}}]
            async for doc in Content.aggregate(pipeline):
                content_counts[doc["_id"]] = doc["count"]

            total = sum(content_counts.values())

            recent = await Content.find().sort("-created_at").limit(5).to_list()
            recent_additions = [
                {"title": c.title, "type": c.content_type, "created": c.created_at.isoformat()}
                for c in recent
            ]

            context = DatabaseContext(
                content_counts=content_counts,
                recent_additions=recent_additions,
                total_content=total,
            )
            self._cache[cache_key] = context
            self._cache_times[cache_key] = datetime.now(timezone.utc)
            return context
        except Exception as e:
            logger.warning(f"Failed to gather database context: {e}")
            return DatabaseContext.empty()

    def _is_cache_valid(self, key: str, ttl_seconds: int) -> bool:
        """Check if cached value is still valid."""
        if key not in self._cache or key not in self._cache_times:
            return False
        age = (datetime.now(timezone.utc) - self._cache_times[key]).total_seconds()
        return age < ttl_seconds

    def _find_repo_root(self) -> Path:
        """Find the repository root directory."""
        current = Path(__file__).resolve()
        for parent in [current] + list(current.parents):
            if (parent / ".git").exists():
                return parent
        return Path.cwd()

    def _sanitize_output(self, output: str) -> str:
        """Remove potential secrets from git output."""
        patterns = [
            r"(?i)(api[_-]?key|secret|password|token)\s*[=:]\s*\S+",
            r"(?i)bearer\s+\S+",
            r"sk-[a-zA-Z0-9]{20,}",
            r"sk_live_[a-zA-Z0-9]+",
            r"ghp_[a-zA-Z0-9]+",
        ]
        for pattern in patterns:
            output = re.sub(pattern, "[REDACTED]", output)
        return output


@lru_cache(maxsize=1)
def get_ecosystem_context_provider() -> EcosystemContextProvider:
    """Get singleton ecosystem context provider."""
    return EcosystemContextProvider()
