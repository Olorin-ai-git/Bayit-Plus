"""Atlas Search executor (Stage 2a): $search aggregation pipelines."""

import asyncio
from typing import Any, Dict, List

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


class AtlasSearchExecutor:
    """Build and execute MongoDB Atlas Search aggregation pipelines."""

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
            if ct == "vod":
                tasks.append(self._search_content(analysis, filters, sort_by, sort_order, limit))
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
        if filters.is_beta_user is False:
            must.append({"equals": {"path": "is_beta_content", "value": False}})

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

        return await self._run_pipeline(Content, pipeline, "vod", fetch_limit)

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
        if filters.is_beta_user is False:
            must.append({"equals": {"path": "is_beta_content", "value": False}})

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

    _BROWSE_MODEL_MAP: Dict[str, Any] = {
        "vod": (Content, "is_published", "vod"),
        "live": (LiveChannel, "is_active", "livechannel"),
        "podcast": (Podcast, "is_active", "podcast"),
        "radio": (RadioStation, "is_active", "radiostation"),
    }

    async def _browse_query(
        self, filters: SearchFilters, sort_by: SortField,
        sort_order: SortOrder, page: int, limit: int,
    ) -> List[ScoredResult]:
        sort_field = _SORT_FIELD_MAP.get(sort_by, "created_at")
        direction = -1 if sort_order == SortOrder.DESC else 1

        tasks = []
        for ct in filters.content_types:
            entry = self._BROWSE_MODEL_MAP.get(ct)
            if entry:
                tasks.append(self._browse_collection(
                    model=entry[0], active_field=entry[1], source=entry[2],
                    filters=filters, sort_field=sort_field, direction=direction,
                    page=page, limit=limit, is_vod=(ct == "vod"),
                ))

        if not tasks:
            return []

        results_lists = await asyncio.gather(*tasks, return_exceptions=True)
        combined: List[ScoredResult] = []
        for result in results_lists:
            if isinstance(result, Exception):
                logger.error("Browse query failed", extra={"error": str(result)})
                continue
            combined.extend(result)

        combined.sort(
            key=lambda r: r.content_dict.get(sort_field, ""),
            reverse=(direction == -1),
        )
        return combined[:limit]

    @staticmethod
    async def _browse_collection(
        model, active_field: str, source: str, filters: SearchFilters,
        sort_field: str, direction: int, page: int, limit: int, is_vod: bool,
    ) -> List[ScoredResult]:
        match: Dict[str, Any] = {active_field: True}
        if filters.is_beta_user is False:
            match["is_beta_content"] = {"$ne": True}
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
                  .skip((page - 1) * limit)
                  .limit(limit))
        docs = await cursor.to_list(length=limit)
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

        return docs_to_scored(docs, source)
