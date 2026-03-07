"""
BYOC Dedup Detector

Groups manifest entries that refer to the same channel/content and
ranks duplicates by resolution quality to recommend a primary stream.
"""

from collections import defaultdict
from typing import Dict, List, Tuple

from app.api.routes.byoc_normalization_models import (
    BYOCManifestEntry,
    DuplicateGroup,
    MatchedChannel,
)
from app.core.logging_config import get_logger
from app.services.byoc.channel_index_service import normalize_channel_name

logger = get_logger(__name__)

RESOLUTION_RANK: Dict[str, int] = {
    "4k": 4,
    "uhd": 4,
    "2160p": 4,
    "fhd": 3,
    "1080p": 3,
    "hd": 2,
    "720p": 2,
    "sd": 1,
    "480p": 1,
}


def _resolution_score(entry: BYOCManifestEntry) -> int:
    """Score a manifest entry by resolution tag."""
    tag = (entry.resolution_tag or "").lower().strip()
    if tag in RESOLUTION_RANK:
        return RESOLUTION_RANK[tag]
    name_lower = entry.name.lower()
    for key, score in RESOLUTION_RANK.items():
        if key in name_lower:
            return score
    return 0


class BYOCDedupDetector:
    """Detects duplicate channels in a manifest."""

    def detect(
        self,
        entries: List[BYOCManifestEntry],
        matched_channels: List[MatchedChannel],
    ) -> List[DuplicateGroup]:
        """Find duplicate groups based on canonical names from matching.

        Args:
            entries: Original manifest entries.
            matched_channels: Results from channel index matching.

        Returns:
            List of DuplicateGroup with primary + alternate indices.
        """
        canonical_groups: Dict[str, List[int]] = defaultdict(list)

        for mc in matched_channels:
            canonical_groups[mc.canonical_name].append(mc.index)

        unmatched_groups: Dict[str, List[int]] = defaultdict(list)
        matched_indices = {mc.index for mc in matched_channels}
        for i, entry in enumerate(entries):
            if i in matched_indices:
                continue
            if entry.content_type != "live_channel":
                continue
            normalized = normalize_channel_name(entry.name)
            if normalized:
                unmatched_groups[normalized].append(i)

        for key, indices in unmatched_groups.items():
            if len(indices) > 1:
                canonical_groups[f"_unmatched:{key}"] = indices

        duplicates: List[DuplicateGroup] = []
        for canonical, indices in canonical_groups.items():
            if len(indices) < 2:
                continue

            scored: List[Tuple[int, int]] = [
                (_resolution_score(entries[idx]), idx)
                for idx in indices
            ]
            scored.sort(key=lambda x: x[0], reverse=True)

            primary_idx = scored[0][1]
            alternate_indices = [idx for _, idx in scored[1:]]

            duplicates.append(
                DuplicateGroup(
                    canonical_name=canonical.replace("_unmatched:", ""),
                    primary_index=primary_idx,
                    alternate_indices=alternate_indices,
                    primary_resolution=entries[primary_idx].resolution_tag,
                )
            )

        logger.info(
            "Dedup found groups=%d total_duplicates=%d",
            len(duplicates),
            sum(len(d.alternate_indices) for d in duplicates),
        )
        return duplicates
