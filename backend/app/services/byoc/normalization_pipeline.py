"""
BYOC Normalization Pipeline

Orchestrates the six-stage normalization of a BYOC manifest:
1. Channel Index lookup (live TV)
2. TMDB lookup (VOD)
3. Dedup detection
4. AI classification (unknowns)
5. Language/region detection
6. Build NormalizationPlan response
"""

from collections import Counter
from typing import Dict, List

from app.api.routes.byoc_normalization_models import (
    BYOCManifest,
    MatchedChannel,
    MatchedVOD,
    NormalizationPlan,
    NormalizationStats,
    UnresolvedEntry,
)
from app.core.logging_config import get_logger
from app.services.byoc.ai_classifier import BYOCAIClassifier
from app.services.byoc.channel_index_service import ChannelIndexService
from app.services.byoc.dedup_detector import BYOCDedupDetector

logger = get_logger(__name__)

VOD_CONTENT_TYPES = {"movie", "series", "episode", "video"}


class BYOCNormalizationPipeline:
    """Runs the full normalization pipeline on a BYOC manifest."""

    def __init__(self, job_id: str):
        self.job_id = job_id
        self.channel_svc = ChannelIndexService()
        self.ai_classifier = BYOCAIClassifier()
        self.dedup_detector = BYOCDedupDetector()

    async def run(
        self,
        manifest: BYOCManifest,
        progress_cb=None,
    ) -> NormalizationPlan:
        """Execute all pipeline stages and return a NormalizationPlan."""
        entries = manifest.entries

        if progress_cb:
            await progress_cb("channel_index_lookup", 0.1)

        matched_channels = await self._stage1_channel_lookup(entries)

        if progress_cb:
            await progress_cb("tmdb_lookup", 0.3)

        matched_vod = await self._stage2_tmdb_lookup(entries)

        if progress_cb:
            await progress_cb("dedup_detection", 0.5)

        duplicates = self.dedup_detector.detect(entries, matched_channels)

        if progress_cb:
            await progress_cb("ai_classification", 0.6)

        matched_indices = (
            {mc.index for mc in matched_channels}
            | {mv.index for mv in matched_vod}
        )
        unresolved = await self._stage4_ai_classify(entries, matched_indices)

        if progress_cb:
            await progress_cb("language_detection", 0.85)

        languages, categories = self._stage5_language_detection(
            entries, matched_channels, unresolved,
        )

        if progress_cb:
            await progress_cb("building_plan", 0.95)

        entry_ids = [m[1].id for m in [
            await self.channel_svc.match_channel(mc.original_name)
            for mc in matched_channels
        ] if m]
        await self.channel_svc.increment_match_counts(
            [eid for eid in entry_ids if eid],
        )

        stats = NormalizationStats(
            total=len(entries),
            matched_channels=len(matched_channels),
            matched_vod=len(matched_vod),
            duplicates_found=sum(len(d.alternate_indices) for d in duplicates),
            unresolved=len(unresolved),
        )

        return NormalizationPlan(
            job_id=self.job_id,
            status="completed",
            matched_channels=matched_channels,
            matched_vod=matched_vod,
            duplicates=duplicates,
            unresolved=unresolved,
            detected_languages=languages,
            suggested_categories=categories,
            health_sample=manifest.health_sample,
            stats=stats,
        )

    async def _stage1_channel_lookup(
        self, entries,
    ) -> List[MatchedChannel]:
        """Stage 1: Match live channels against the channel index."""
        results: List[MatchedChannel] = []
        for i, entry in enumerate(entries):
            if entry.content_type != "live_channel":
                continue
            match = await self.channel_svc.match_channel(entry.name)
            if match:
                idx_entry, confidence = match
                results.append(MatchedChannel(
                    index=i,
                    original_name=entry.name,
                    canonical_name=idx_entry.canonical_name,
                    logo_url=idx_entry.logo_url,
                    epg_id=idx_entry.epg_id,
                    category=idx_entry.category,
                    language=idx_entry.language,
                    country=idx_entry.country,
                    confidence=confidence,
                ))
        logger.info("Stage 1 matched channels=%d", len(results))
        return results

    async def _stage2_tmdb_lookup(
        self, entries,
    ) -> List[MatchedVOD]:
        """Stage 2: Match VOD items against TMDB."""
        from app.services.tmdb_service import tmdb_service

        results: List[MatchedVOD] = []
        for i, entry in enumerate(entries):
            if entry.content_type not in VOD_CONTENT_TYPES:
                continue
            try:
                if entry.content_type in ("series", "episode"):
                    data = await tmdb_service.enrich_series_content(
                        entry.name, entry.year,
                    )
                else:
                    data = await tmdb_service.enrich_movie_content(
                        entry.name, entry.year,
                    )
                if data.get("tmdb_id"):
                    results.append(MatchedVOD(
                        index=i,
                        original_name=entry.name,
                        tmdb_id=data["tmdb_id"],
                        imdb_id=data.get("imdb_id"),
                        poster_url=data.get("poster"),
                        backdrop_url=data.get("backdrop"),
                        overview=data.get("overview"),
                        genres=data.get("genres", []),
                        year=data.get("release_year"),
                    ))
            except Exception:
                logger.exception("TMDB lookup failed entry=%s", entry.name)
        logger.info("Stage 2 matched VOD=%d", len(results))
        return results

    async def _stage4_ai_classify(
        self, entries, matched_indices,
    ) -> List[UnresolvedEntry]:
        """Stage 4: AI-classify unmatched entries."""
        unmatched = [
            {"name": e.name, "group": e.group}
            for i, e in enumerate(entries)
            if i not in matched_indices and e.content_type == "live_channel"
        ]
        unmatched_indices = [
            i for i, e in enumerate(entries)
            if i not in matched_indices and e.content_type == "live_channel"
        ]

        if not unmatched:
            return []

        classifications = await self.ai_classifier.classify_batch(unmatched)
        await self.ai_classifier.create_index_entries(classifications)

        unresolved: List[UnresolvedEntry] = []
        cls_map: Dict[str, dict] = {
            c.get("name", ""): c for c in classifications
        }
        for idx, um in zip(unmatched_indices, unmatched):
            cls = cls_map.get(um["name"], {})
            conf = cls.get("confidence", 0.0)
            unresolved.append(UnresolvedEntry(
                index=idx,
                name=um["name"],
                group=um.get("group"),
                ai_suggestion=cls.get("canonical_name"),
                ai_category=cls.get("category"),
                ai_confidence=conf,
            ))

        logger.info("Stage 4 unresolved=%d", len(unresolved))
        return unresolved

    def _stage5_language_detection(
        self, entries, matched_channels, unresolved,
    ):
        """Stage 5: Detect languages and suggest categories."""
        lang_counter: Counter = Counter()
        cat_counter: Counter = Counter()

        for mc in matched_channels:
            lang_counter[mc.language] += 1
            cat_counter[mc.category] += 1

        for entry in entries:
            if entry.language_hint:
                lang_counter[entry.language_hint] += 1

        for ur in unresolved:
            if ur.ai_category:
                cat_counter[ur.ai_category] += 1

        languages = [lang for lang, _ in lang_counter.most_common(10)]
        categories = [cat for cat, _ in cat_counter.most_common(10)]

        logger.info("Stage 5 languages=%s categories=%s", languages, categories)
        return languages, categories
