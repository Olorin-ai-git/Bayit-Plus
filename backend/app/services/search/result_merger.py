"""
Stage 3: Result Merger - combines Atlas Search and Pinecone results.
Uses Reciprocal Rank Fusion (RRF) for score fusion, then applies
metadata signal boosting (freshness, popularity, rating, featured).
"""
import math
import unicodedata
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.olorin_config import SearchRankingConfig
from app.services.search.models import ScoredResult, SortField, SortOrder

logger = get_logger(__name__)


def _log_norm(value: float, cap: int) -> float:
    """Logarithmic normalization clamped to [0, 1]."""
    return min(1.0, math.log1p(value) / math.log1p(cap))


def _normalize_text(text: str) -> str:
    """Strip accents/nikud and lowercase for comparison."""
    nfkd = unicodedata.normalize("NFKD", text)
    stripped = "".join(
        ch for ch in nfkd if not unicodedata.combining(ch)
    )
    return stripped.strip().lower()


class ResultMerger:
    """Merges Atlas and Pinecone results via RRF with metadata boosting."""

    def merge(
        self,
        atlas_results: List[ScoredResult],
        pinecone_results: List[ScoredResult],
        query: str,
        sort_by: SortField,
        sort_order: SortOrder,
    ) -> List[ScoredResult]:
        config = settings.olorin.search_ranking
        merged = self._fuse_rrf(atlas_results, pinecone_results, config)
        normalized_query = _normalize_text(query)

        for result in merged:
            self._apply_metadata_boost(result, normalized_query, config)

        if sort_by == SortField.RELEVANCE:
            merged.sort(key=lambda r: r.final_score, reverse=True)
        else:
            merged = self._apply_sort(merged, sort_by, sort_order)

        logger.debug(
            "Merged search results",
            extra={
                "atlas_count": len(atlas_results),
                "pinecone_count": len(pinecone_results),
                "merged_count": len(merged),
                "sort_by": sort_by.value,
            },
        )
        return merged

    def _fuse_rrf(
        self,
        atlas_results: List[ScoredResult],
        pinecone_results: List[ScoredResult],
        config: SearchRankingConfig,
    ) -> List[ScoredResult]:
        """Deduplicate and compute RRF scores keyed by content_id."""
        index: Dict[str, ScoredResult] = {}

        for rank, result in enumerate(atlas_results, start=1):
            entry = result.model_copy()
            entry.atlas_rank = rank
            entry.source = "atlas"
            index[result.content_id] = entry

        for rank, result in enumerate(pinecone_results, start=1):
            if result.content_id in index:
                existing = index[result.content_id]
                existing.pinecone_rank = rank
                existing.pinecone_score = result.pinecone_score
                existing.source = "both"
            else:
                entry = result.model_copy()
                entry.pinecone_rank = rank
                entry.source = "pinecone"
                index[result.content_id] = entry

        k = config.rrf_k
        for entry in index.values():
            atlas_term = (
                config.atlas_weight / (k + entry.atlas_rank)
                if entry.atlas_rank > 0
                else 0.0
            )
            pinecone_term = (
                config.pinecone_weight / (k + entry.pinecone_rank)
                if entry.pinecone_rank > 0
                else 0.0
            )
            entry.rrf_score = atlas_term + pinecone_term

        return list(index.values())

    def _apply_metadata_boost(
        self,
        result: ScoredResult,
        normalized_query: str,
        config: SearchRankingConfig,
    ) -> None:
        """Compute final_score from RRF base + metadata signals."""
        cd = result.content_dict

        # Title exact match multiplier
        title_raw = cd.get("title") or cd.get("title_en") or ""
        title_multiplier = (
            config.title_exact_match_multiplier
            if _normalize_text(title_raw) == normalized_query and normalized_query
            else 1.0
        )

        # Freshness signal
        freshness = 0.0
        created = cd.get("created_at") or cd.get("release_date")
        if created:
            age = self._days_since(created)
            if age is not None:
                half_life = config.freshness_half_life_days
                freshness = math.exp(-0.693 * age / half_life)

        # Popularity signal
        view_count = float(cd.get("view_count", 0) or 0)
        avg_rating = float(cd.get("avg_rating", 0) or 0)
        popularity = (
            0.6 * _log_norm(view_count, config.popularity_normalization_cap)
            + 0.4 * (avg_rating / 10.0)
        )

        # Featured signal
        featured = 1.0 if cd.get("is_featured") else 0.0

        # Rating signal
        rating_signal = avg_rating / 10.0

        # Final score
        base = result.rrf_score * config.relevance_weight
        metadata = (
            popularity * config.popularity_weight
            + freshness * config.freshness_weight
            + rating_signal * config.rating_weight
            + featured * config.featured_boost
        )
        result.final_score = (base + metadata) * title_multiplier

    def _days_since(self, value) -> Optional[float]:
        """Return days elapsed since a datetime or ISO string."""
        now = datetime.now(timezone.utc)
        if isinstance(value, str):
            try:
                dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                return None
        elif isinstance(value, datetime):
            dt = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        else:
            return None
        delta = (now - dt).total_seconds()
        return max(delta / 86400.0, 0.0)

    def _apply_sort(
        self,
        results: List[ScoredResult],
        sort_by: SortField,
        sort_order: SortOrder,
    ) -> List[ScoredResult]:
        """Re-sort results by a metadata field instead of relevance."""
        field_map = {
            SortField.DATE: ("created_at", "release_date"),
            SortField.RATING: ("avg_rating",),
            SortField.POPULARITY: ("view_count",),
            SortField.TITLE: ("title",),
            SortField.YEAR: ("year", "release_year"),
        }
        keys = field_map.get(sort_by, ())
        descending = sort_order == SortOrder.DESC

        def sort_key(r: ScoredResult):
            for key in keys:
                val = r.content_dict.get(key)
                if val is not None:
                    return val
            return ""

        return sorted(results, key=sort_key, reverse=descending)
