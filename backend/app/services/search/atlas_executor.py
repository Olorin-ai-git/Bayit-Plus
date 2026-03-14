"""Atlas Search executor (Stage 2a): $search aggregation pipelines."""

import asyncio
from typing import Any, Dict, List

from app.api.routes.content.utils import SERIES_CATEGORY_KEYWORDS
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.content import Content, LiveChannel, Podcast, RadioStation
from app.services.search.atlas_helpers import build_content_filters, docs_to_scored, fallback_text
from app.services.search.models import (
    QueryAnalysis, ScoredResult, SearchFilters, SearchIntent, SortField, SortOrder,
)

logger = get_logger(__name__)

_SORT_FIELD_MAP: Dict[SortField, str] = {
    SortField.DATE: "created_at",
    SortField.RATING: "avg_rating",
    SortField.POPULARITY: "view_count",
    SortField.TITLE: "title",
    SortField.YEAR: "year",
}

_VOD_SUBTYPES = {"vod", "audiobook", "series", "movie", "collection"}
_BROWSE_POOL_CAP = 300

_SERIES_REGEX = "|".join(SERIES_CATEGORY_KEYWORDS)


class AtlasSearchExecutor:
    """Build and execute MongoDB Atlas Search aggregation pipelines."""

    def __init__(self) -> None:
        self._browse_total: int | None = None

    async def execute(
        self,
        analysis: QueryAnalysis,
        filters: SearchFilters,
        sort_by: SortField,
        sort_order: SortOrder,
        page: int,
        limit: int,
    ) -> List[ScoredResult]:
        config = settings.olorin.search_ranking

        if analysis.is_empty or analysis.intent == SearchIntent.BROWSE:
            return await self._browse_query(filters, sort_by, sort_order, page, limit)

        tasks = []
        for ct in filters.content_types:
            if ct in _VOD_SUBTYPES:
                tasks.append(self._search_content(
                    analysis, filters, sort_by, sort_order, limit,
                    content_subtype=ct,
                ))
            elif ct == "live":
                tasks.append(self._search_simple(
                    LiveChannel, config.live_channels_search_index,
                    ["name", "name_en", "name_es"], ["description"],
                    analysis, filters, "is_active", sort_by, sort_order, limit))
            elif ct == "podcast":
                tasks.append(self._search_simple(
                    Podcast, config.podcasts_search_index,
                    ["title", "title_en", "title_es"], ["description"],
                    analysis, filters, "is_active", sort_by, sort_order, limit))
            elif ct == "radio":
                tasks.append(self._search_simple(
                    RadioStation, config.radio_stations_search_index,
                    ["name", "name_en", "name_es"], ["description"],
                    analysis, filters, "is_active", sort_by, sort_order, limit))

        if not tasks:
            return []

        results_lists = await asyncio.gather(*tasks, return_exceptions=True)
        combined: List[ScoredResult] = []
        for result in results_lists:
            if isinstance(result, Exception):
                logger.error("Search task failed", extra={"error": str(result)})
                continue
            combined.extend(result)

        combined.sort(key=lambda r: r.atlas_score, reverse=True)
        return combined

    async def _search_content(
        self, analysis: QueryAnalysis, filters: SearchFilters,
        sort_by: SortField, sort_order: SortOrder, limit: int,
        content_subtype: str = "vod",
    ) -> List[ScoredResult]:
        config = settings.olorin.search_ranking
        query = analysis.normalized_query

        should: List[Dict[str, Any]] = [
            {"phrase": {"query": query, "path": ["title", "title_en", "title_es"],
                        "score": {"boost": {"value": config.phrase_boost}}, "slop": 1}},
            {"text": {"query": query, "path": ["title", "title_en", "title_es"],
                      "score": {"boost": {"value": config.title_boost}},
                      "fuzzy": {"maxEdits": analysis.fuzzy_distance}}},
            {"text": {"query": query, "path": ["description", "description_en", "description_es"],
                      "score": {"boost": {"value": config.description_boost}},
                      "fuzzy": {"maxEdits": analysis.fuzzy_distance}}},
            {"text": {"query": query, "path": ["cast", "director", "author", "narrator"],
                      "score": {"boost": {"value": config.cast_boost}},
                      "fuzzy": {"maxEdits": min(analysis.fuzzy_distance, 1)}}},
        ]

        must: List[Dict[str, Any]] = [{"equals": {"path": "is_published", "value": True}}]
        if content_subtype == "audiobook":
            must.append({"equals": {"path": "content_format", "value": "audiobook"}})

        filter_clauses = build_content_filters(filters)

        fetch_limit = limit * config.atlas_overfetch_multiplier
        pipeline: List[Dict[str, Any]] = [
            {"$search": {"index": config.content_search_index, "compound": {
                "must": must, "should": should, "minimumShouldMatch": 1,
                "filter": filter_clauses,
            }}},
            {"$addFields": {"search_score": {"$meta": "searchScore"}}},
            {"$limit": fetch_limit},
        ]

        if sort_by != SortField.RELEVANCE:
            field = _SORT_FIELD_MAP.get(sort_by, "created_at")
            direction = 1 if sort_order == SortOrder.ASC else -1
            pipeline.append({"$sort": {field: direction}})

        results = await self._run_pipeline(Content, pipeline, "vod", fetch_limit)
        return _filter_by_subtype(results, content_subtype)

    async def _search_simple(
        self, model, index_name: str, title_paths: List[str], desc_paths: List[str],
        analysis: QueryAnalysis, filters: SearchFilters, active_field: str,
        sort_by: SortField, sort_order: SortOrder, limit: int,
    ) -> List[ScoredResult]:
        config = settings.olorin.search_ranking
        query = analysis.normalized_query

        should: List[Dict[str, Any]] = [
            {"phrase": {"query": query, "path": title_paths,
                        "score": {"boost": {"value": config.phrase_boost}}, "slop": 1}},
            {"text": {"query": query, "path": title_paths,
                      "score": {"boost": {"value": config.title_boost}},
                      "fuzzy": {"maxEdits": analysis.fuzzy_distance}}},
            {"text": {"query": query, "path": desc_paths,
                      "score": {"boost": {"value": config.description_boost}},
                      "fuzzy": {"maxEdits": analysis.fuzzy_distance}}},
        ]
        must: List[Dict[str, Any]] = [{"equals": {"path": active_field, "value": True}}]

        fetch_limit = limit * config.atlas_overfetch_multiplier
        content_type = model.__name__.lower()
        pipeline: List[Dict[str, Any]] = [
            {"$search": {"index": index_name, "compound": {
                "must": must, "should": should, "minimumShouldMatch": 1,
            }}},
            {"$addFields": {"search_score": {"$meta": "searchScore"}}},
            {"$limit": fetch_limit},
        ]
        if sort_by != SortField.RELEVANCE:
            field = _SORT_FIELD_MAP.get(sort_by, "created_at")
            direction = 1 if sort_order == SortOrder.ASC else -1
            pipeline.append({"$sort": {field: direction}})

        return await self._run_pipeline(model, pipeline, content_type, fetch_limit)

    # ------------------------------------------------------------------
    # Browse (empty query) path
    # ------------------------------------------------------------------

    _BROWSE_MODEL_MAP: Dict[str, Any] = {
        "vod": (Content, "is_published", "vod", {"content_format": {"$ne": "audiobook"}}),
        "movie": (Content, "is_published", "vod", {
            "content_format": {"$ne": "audiobook"},
            "category_name": {"$not": {"$regex": _SERIES_REGEX + "|collection", "$options": "i"}},
            "$and": [
                {"$or": [{"series_id": {"$exists": False}}, {"series_id": None}]},
                {"$or": [{"total_episodes": {"$exists": False}}, {"total_episodes": None}]},
            ],
            "title": {"$not": {"$regex": "collection$", "$options": "i"}},
        }),
        "series": (Content, "is_published", "vod", {
            "content_format": {"$ne": "audiobook"},
            "category_name": {"$regex": _SERIES_REGEX, "$options": "i"},
            "total_episodes": {"$gt": 0},
            "$and": [
                {"$or": [{"series_id": None}, {"series_id": {"$exists": False}}, {"series_id": ""}]},
                {"$or": [{"season": None}, {"season": {"$exists": False}}]},
                {"$or": [{"episode": None}, {"episode": {"$exists": False}}]},
            ],
        }),
        "collection": (Content, "is_published", "vod", {
            "content_format": {"$ne": "audiobook"},
            "$or": [
                {"title": {"$regex": "collection$", "$options": "i"}},
                {"category_name": {"$regex": "collection", "$options": "i"}},
            ],
        }),
        "audiobook": (Content, "is_published", "vod", {"content_format": "audiobook"}),
        "live": (LiveChannel, "is_active", "livechannel", {}),
        "podcast": (Podcast, "is_active", "podcast", {}),
        "radio": (RadioStation, "is_active", "radiostation", {}),
    }

    async def _browse_query(
        self, filters: SearchFilters, sort_by: SortField,
        sort_order: SortOrder, page: int, limit: int,
    ) -> List[ScoredResult]:
        self._browse_total = None
        sort_field = _SORT_FIELD_MAP.get(sort_by, "created_at")
        direction = -1 if sort_order == SortOrder.DESC else 1

        active_types = [ct for ct in filters.content_types if ct in self._BROWSE_MODEL_MAP]
        if not active_types:
            return []

        pool_total = min(_BROWSE_POOL_CAP, page * limit + limit)
        per_type = max(1, pool_total // len(active_types))

        fetch_tasks = []
        count_tasks = []
        for ct in active_types:
            entry = self._BROWSE_MODEL_MAP[ct]
            fetch_tasks.append(self._browse_collection(
                model=entry[0], active_field=entry[1], source=entry[2],
                extra_match=entry[3],
                filters=filters, sort_field=sort_field, direction=direction,
                fetch_limit=per_type, is_vod=(ct in _VOD_SUBTYPES),
            ))
            count_tasks.append(self._count_collection(
                model=entry[0], active_field=entry[1],
                extra_match=entry[3], filters=filters, is_vod=(ct in _VOD_SUBTYPES),
            ))

        all_results = await asyncio.gather(*fetch_tasks, *count_tasks, return_exceptions=True)
        fetch_results = all_results[:len(fetch_tasks)]
        count_results = all_results[len(fetch_tasks):]

        total_count = 0
        for result in count_results:
            if isinstance(result, Exception):
                logger.error("Browse count failed", extra={"error": str(result)})
            else:
                total_count += result

        per_type_results: List[List[ScoredResult]] = []
        for result in fetch_results:
            if isinstance(result, Exception):
                logger.error("Browse query failed", extra={"error": str(result)})
                per_type_results.append([])
            else:
                per_type_results.append(list(result))

        combined: List[ScoredResult] = []
        max_len = max((len(r) for r in per_type_results), default=0)
        for i in range(max_len):
            for bucket in per_type_results:
                if i < len(bucket):
                    combined.append(bucket[i])

        self._browse_total = total_count
        return combined[:pool_total]

    @staticmethod
    async def _count_collection(
        model, active_field: str, extra_match: Dict[str, Any],
        filters: SearchFilters, is_vod: bool,
    ) -> int:
        match: Dict[str, Any] = {active_field: True}
        if extra_match:
            match.update(extra_match)
        if is_vod:
            if filters.genres:
                match["genres"] = {"$in": filters.genres}
            if filters.year_min is not None:
                match.setdefault("year", {})["$gte"] = filters.year_min
            if filters.year_max is not None:
                match.setdefault("year", {})["$lte"] = filters.year_max
            if filters.is_kids_content is True:
                match["is_kids_content"] = True
        collection = model.get_pymongo_collection()
        return await collection.count_documents(match)

    @staticmethod
    async def _browse_collection(
        model, active_field: str, source: str, extra_match: Dict[str, Any],
        filters: SearchFilters,
        sort_field: str, direction: int, fetch_limit: int, is_vod: bool,
    ) -> List[ScoredResult]:
        match: Dict[str, Any] = {active_field: True}
        if extra_match:
            match.update(extra_match)
        if is_vod:
            if filters.genres:
                match["genres"] = {"$in": filters.genres}
            if filters.year_min is not None:
                match.setdefault("year", {})["$gte"] = filters.year_min
            if filters.year_max is not None:
                match.setdefault("year", {})["$lte"] = filters.year_max
            if filters.is_kids_content is True:
                match["is_kids_content"] = True

        collection = model.get_pymongo_collection()
        cursor = (collection.find(match)
                  .sort(sort_field, direction)
                  .limit(fetch_limit))
        docs = await cursor.to_list(length=fetch_limit)
        return docs_to_scored(docs, source)

    @staticmethod
    async def _run_pipeline(
        model, pipeline: List[Dict[str, Any]], source: str, fetch_limit: int,
    ) -> List[ScoredResult]:
        collection = model.get_pymongo_collection()
        try:
            docs = await collection.aggregate(pipeline).to_list(length=fetch_limit)
        except Exception as exc:
            logger.warning("Atlas $search failed, falling back",
                           extra={"source": source, "error": str(exc)})
            return await fallback_text(model, pipeline, source, fetch_limit)

        if docs:
            return docs_to_scored(docs, source)

        # Atlas index returned 0 results — try $text / $regex fallback
        # so queries still work when the index analyzer misses matches.
        logger.debug("Atlas $search returned 0 results, trying fallback",
                     extra={"source": source})
        return await fallback_text(model, pipeline, source, fetch_limit)


def _filter_by_subtype(results: List[ScoredResult], subtype: str) -> List[ScoredResult]:
    """Filter search results by derived content_type to match the requested subtype."""
    if subtype == "vod":
        return [r for r in results if r.content_dict.get("content_type") != "audiobook"]
    if subtype == "series":
        return [r for r in results if r.content_dict.get("content_type") == "series"
                and not r.content_dict.get("series_id")
                and (r.content_dict.get("total_episodes") or 0) > 0]
    return [r for r in results if r.content_dict.get("content_type") == subtype]
