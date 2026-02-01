"""
Documentation Indexer for Semantic Search

Indexes documentation articles into Pinecone for semantic/vector search.
This enables the Avatar/voice assistant to find relevant documentation
using natural language queries.
"""

import json
import logging
from pathlib import Path
from typing import Any, Optional

from app.core.config import settings
from app.models.content_embedding import ContentEmbedding
from app.services.olorin.search.client import client_manager
from app.services.olorin.search.embedding import generate_embedding
from app.services.olorin.search.helpers import generate_vector_id
from app.services.olorin.search.pinecone_ops import safe_pinecone_upsert

logger = logging.getLogger(__name__)

# Path to documentation
DOCS_PATH = Path(__file__).parent.parent.parent.parent.parent / "shared" / "data" / "support" / "docs"


async def index_documentation(
    language: str = "en",
    category: Optional[str] = None,
    force_reindex: bool = False,
) -> dict[str, Any]:
    """
    Index all documentation articles for semantic search.

    Args:
        language: Language code (en, he, es)
        category: Optional category filter
        force_reindex: Re-index even if already indexed

    Returns:
        Indexing status with counts
    """
    if not client_manager.is_initialized:
        await client_manager.initialize()

    manifest_path = DOCS_PATH / "manifest.json"
    if not manifest_path.exists():
        return {"status": "failed", "error": "Manifest not found"}

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    articles = manifest.get("articles", [])
    indexed_count = 0
    skipped_count = 0
    failed_count = 0

    for article in articles:
        # Filter by category if specified
        if category and article.get("category") != category:
            continue

        # Check if article supports the language
        if language not in article.get("languages", ["en"]):
            continue

        slug = article.get("slug", "")
        article_id = f"doc_{slug}_{language}"

        # Check if already indexed
        if not force_reindex:
            existing = await ContentEmbedding.find_one(
                ContentEmbedding.content_id == article_id,
                ContentEmbedding.embedding_type == "documentation",
            )
            if existing:
                skipped_count += 1
                continue

        # Load article content
        article_path = DOCS_PATH / language / f"{slug}.md"
        if not article_path.exists():
            logger.warning(f"Article not found: {article_path}")
            failed_count += 1
            continue

        with open(article_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Index the article
        result = await _index_documentation_article(
            article_id=article_id,
            slug=slug,
            content=content,
            metadata=article,
            language=language,
        )

        if result.get("status") == "completed":
            indexed_count += 1
        else:
            failed_count += 1

    return {
        "status": "completed",
        "language": language,
        "indexed": indexed_count,
        "skipped": skipped_count,
        "failed": failed_count,
        "total_articles": len(articles),
    }


async def _index_documentation_article(
    article_id: str,
    slug: str,
    content: str,
    metadata: dict,
    language: str,
) -> dict[str, Any]:
    """Index a single documentation article."""
    try:
        # Create searchable text from title + keywords + content
        title = metadata.get("title_key", slug)
        keywords = metadata.get("keywords", [])
        category = metadata.get("category", "")

        # Combine for embedding (title weighted by repetition)
        searchable_text = f"{title}\n{title}\n{' '.join(keywords)}\n{content[:3000]}"

        embedding = await generate_embedding(searchable_text)
        if not embedding:
            return {"status": "failed", "error": "Embedding generation failed"}

        vector_id = generate_vector_id(article_id, "documentation", 0)

        vector = {
            "id": vector_id,
            "values": embedding,
            "metadata": {
                "content_id": article_id,
                "content_type": "documentation",
                "embedding_type": "documentation",
                "language": language,
                "category": category,
                "slug": slug,
                "title": title,
                "keywords": keywords[:10],
                "text": content[:1000],
            },
        }

        # Upsert to Pinecone
        pinecone_index = client_manager.pinecone_index
        if pinecone_index:
            await safe_pinecone_upsert(pinecone_index, [vector])

        # Save to MongoDB
        embedding_doc = ContentEmbedding(
            content_id=article_id,
            content_type="documentation",
            embedding_type="documentation",
            segment_text=content[:2000],
            embedding_model=settings.EMBEDDING_MODEL,
            pinecone_vector_id=vector_id,
            language=language,
        )
        await embedding_doc.insert()

        return {"status": "completed", "article_id": article_id}

    except Exception as e:
        logger.error(f"Failed to index article {article_id}: {e}")
        return {"status": "failed", "error": str(e)}


async def search_documentation(
    query: str,
    language: str = "en",
    category: Optional[str] = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """
    Semantic search across documentation and knowledge base.

    Args:
        query: Natural language search query
        language: Language code
        category: Optional category filter
        limit: Maximum results

    Returns:
        List of matching documentation/knowledge with relevance scores
    """
    if not client_manager.is_initialized:
        await client_manager.initialize()

    embedding = await generate_embedding(query)
    if not embedding:
        return []

    # Build filter - search both documentation and knowledge types
    filter_dict: dict[str, Any] = {
        "content_type": {"$in": ["documentation", "knowledge"]},
        "language": language,
    }
    if category:
        filter_dict["category"] = category

    # Query Pinecone
    pinecone_index = client_manager.pinecone_index
    if not pinecone_index:
        return []

    try:
        results = pinecone_index.query(
            vector=embedding,
            filter=filter_dict,
            top_k=limit,
            include_metadata=True,
        )

        matches = []
        for match in results.get("matches", []):
            metadata = match.get("metadata", {})
            matches.append({
                "slug": metadata.get("slug", ""),
                "title": metadata.get("title", ""),
                "category": metadata.get("category", ""),
                "keywords": metadata.get("keywords", []),
                "excerpt": metadata.get("text", "")[:500],
                "score": match.get("score", 0),
                "language": metadata.get("language", language),
                "content_type": metadata.get("content_type", "documentation"),
            })

        return matches

    except Exception as e:
        logger.error(f"Documentation search failed: {e}")
        return []


async def index_custom_knowledge(
    knowledge_id: str,
    title: str,
    content: str,
    category: str = "avatar",
    keywords: Optional[list[str]] = None,
    language: str = "en",
) -> dict[str, Any]:
    """
    Index custom knowledge content (like avatar dialogues, gestures, etc.)

    Args:
        knowledge_id: Unique identifier for this knowledge
        title: Title/topic of the knowledge
        content: Full content to index
        category: Category for filtering
        keywords: Search keywords
        language: Language code

    Returns:
        Indexing status
    """
    if not client_manager.is_initialized:
        await client_manager.initialize()

    article_id = f"knowledge_{knowledge_id}_{language}"
    keywords = keywords or []

    try:
        searchable_text = f"{title}\n{title}\n{' '.join(keywords)}\n{content}"
        embedding = await generate_embedding(searchable_text)
        if not embedding:
            return {"status": "failed", "error": "Embedding generation failed"}

        vector_id = generate_vector_id(article_id, "knowledge", 0)

        vector = {
            "id": vector_id,
            "values": embedding,
            "metadata": {
                "content_id": article_id,
                "content_type": "knowledge",
                "embedding_type": "knowledge",
                "language": language,
                "category": category,
                "title": title,
                "keywords": keywords[:10],
                "text": content[:1000],
            },
        }

        pinecone_index = client_manager.pinecone_index
        if pinecone_index:
            await safe_pinecone_upsert(pinecone_index, [vector])

        embedding_doc = ContentEmbedding(
            content_id=article_id,
            content_type="knowledge",
            embedding_type="knowledge",
            segment_text=content[:2000],
            embedding_model=settings.EMBEDDING_MODEL,
            pinecone_vector_id=vector_id,
            language=language,
        )
        await embedding_doc.insert()

        return {"status": "completed", "knowledge_id": knowledge_id}

    except Exception as e:
        logger.error(f"Failed to index knowledge {knowledge_id}: {e}")
        return {"status": "failed", "error": str(e)}
