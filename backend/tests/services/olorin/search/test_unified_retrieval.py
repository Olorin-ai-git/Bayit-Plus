"""Unified retrieval: scope filter, boost, dedupe, partition."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.services.olorin.search.unified_retrieval import (
    UnifiedResults,
    query_unified_corpus,
)


def _match(score, content_id=None, canonical_id=None, document_id=None,
           source_type="subtitle_segment", scope="partner:p1",
           canonical_status="active", start_time=None, text="t",
           title="Vid", chunk_index=None, page_number=None):
    meta = {
        "scope": scope,
        "source_type": source_type,
        "text": text,
        "title": title,
    }
    if content_id:
        meta["content_id"] = content_id
    if canonical_id:
        meta["canonical_id"] = canonical_id
        meta["canonical_status"] = canonical_status
    if document_id:
        meta["document_id"] = document_id
        meta["chunk_index"] = chunk_index or 0
        if page_number is not None:
            meta["page_number"] = page_number
    if start_time is not None:
        meta["start_time"] = start_time
    return SimpleNamespace(score=score, metadata=meta)


@pytest.mark.asyncio
async def test_scope_filter_team_tier_global_only():
    fake_matches = SimpleNamespace(matches=[])
    with patch(
        "app.services.olorin.search.unified_retrieval.safe_pinecone_query",
        new=AsyncMock(return_value=fake_matches),
    ) as mq:
        await query_unified_corpus(
            index=object(), query_vec=[0.1] * 3,
            partner_id="p1", tier="team", max_sources=5,
        )
    filter_arg = mq.call_args.kwargs["filter_dict"]
    assert filter_arg["scope"] == "global"


@pytest.mark.asyncio
async def test_scope_filter_org_tier_partner_plus_global():
    fake_matches = SimpleNamespace(matches=[])
    with patch(
        "app.services.olorin.search.unified_retrieval.safe_pinecone_query",
        new=AsyncMock(return_value=fake_matches),
    ) as mq:
        await query_unified_corpus(
            index=object(), query_vec=[0.1] * 3,
            partner_id="p1", tier="organization", max_sources=5,
        )
    filter_arg = mq.call_args.kwargs["filter_dict"]
    assert filter_arg["scope"] == {"$in": ["partner:p1", "global"]}


@pytest.mark.asyncio
async def test_boost_applied_to_canonical_qa():
    fake = SimpleNamespace(matches=[
        _match(0.5, canonical_id="c1", source_type="canonical_qa"),
    ])
    with patch(
        "app.services.olorin.search.unified_retrieval.safe_pinecone_query",
        new=AsyncMock(return_value=fake),
    ):
        result: UnifiedResults = await query_unified_corpus(
            index=object(), query_vec=[0.1] * 3,
            partner_id="p1", tier="organization", max_sources=5,
        )
    assert len(result.canonical_hits) == 1
    assert result.canonical_hits[0].boosted_score == pytest.approx(0.5 * 1.4)


@pytest.mark.asyncio
async def test_stale_canonical_gets_reduced_boost():
    fake = SimpleNamespace(matches=[
        _match(0.5, canonical_id="c1", source_type="canonical_qa",
               canonical_status="stale"),
    ])
    with patch(
        "app.services.olorin.search.unified_retrieval.safe_pinecone_query",
        new=AsyncMock(return_value=fake),
    ):
        result = await query_unified_corpus(
            index=object(), query_vec=[0.1] * 3,
            partner_id="p1", tier="organization", max_sources=5,
        )
    assert result.canonical_hits[0].boosted_score == pytest.approx(0.5 * 0.8)


@pytest.mark.asyncio
async def test_video_dedupe_collapses_30s_bins():
    fake = SimpleNamespace(matches=[
        _match(0.9, content_id="v1", start_time=10.0),
        _match(0.8, content_id="v1", start_time=20.0),
        _match(0.7, content_id="v1", start_time=45.0),
    ])
    with patch(
        "app.services.olorin.search.unified_retrieval.safe_pinecone_query",
        new=AsyncMock(return_value=fake),
    ):
        result = await query_unified_corpus(
            index=object(), query_vec=[0.1] * 3,
            partner_id="p1", tier="organization", max_sources=5,
        )
    assert len(result.video_hits) == 2


@pytest.mark.asyncio
async def test_partitioned_output_by_type():
    fake = SimpleNamespace(matches=[
        _match(0.9, canonical_id="c1", source_type="canonical_qa"),
        _match(0.7, content_id="v1", start_time=0),
        _match(0.6, document_id="d1", chunk_index=2, source_type="document_chunk"),
    ])
    with patch(
        "app.services.olorin.search.unified_retrieval.safe_pinecone_query",
        new=AsyncMock(return_value=fake),
    ):
        result = await query_unified_corpus(
            index=object(), query_vec=[0.1] * 3,
            partner_id="p1", tier="organization", max_sources=5,
        )
    assert len(result.canonical_hits) == 1
    assert len(result.video_hits) == 1
    assert len(result.document_hits) == 1
