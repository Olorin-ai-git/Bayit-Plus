"""
Documentation Search Service
Provides search functionality across documentation articles and FAQ entries.
"""

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.models.documentation import (DocumentationArticle,
                                      DocumentationSearchLog)
from app.models.support import FAQEntry

logger = logging.getLogger(__name__)


class DocsSearchService:
    """Service for searching documentation and FAQ content."""

    def __init__(self):
        self._manifest_cache: Optional[Dict] = None
        self._manifest_loaded_at: Optional[datetime] = None
        self._cache_ttl_seconds = 300  # 5 minutes

    async def search(
        self,
        query: str,
        language: str = "en",
        category: Optional[str] = None,
        audience: Optional[str] = None,
        platform: Optional[str] = None,
        limit: int = 20,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Search documentation articles and FAQ entries.

        Args:
            query: Search query string
            language: Language code (en, he, es)
            category: Filter by category
            audience: Filter by audience type (user, parent, admin, developer)
            platform: Filter by platform (web, ios, android, apple_tv, android_tv, carplay)
            limit: Maximum number of results
            user_id: Optional user ID for logging
            session_id: Optional session ID for logging

        Returns:
            Dict with 'articles', 'faq', 'total' keys
        """
        query = query.strip()
        if not query:
            return {"articles": [], "faq": [], "total": 0}

        # Search both articles and FAQ
        articles = await self._search_articles(
            query=query,
            language=language,
            category=category,
            audience=audience,
            platform=platform,
            limit=limit,
        )

        faq_results = await self._search_faq(
            query=query,
            language=language,
            category=category,
            limit=limit,
        )

        total = len(articles) + len(faq_results)

        # Log the search
        await self._log_search(
            query=query,
            language=language,
            results_count=total,
            user_id=user_id,
            session_id=session_id,
            category_filter=category,
            audience_filter=audience,
        )

        return {
            "articles": articles,
            "faq": faq_results,
            "total": total,
            "query": query,
            "language": language,
        }

    async def _search_articles(
        self,
        query: str,
        language: str,
        category: Optional[str],
        audience: Optional[str],
        platform: Optional[str],
        limit: int,
    ) -> List[Dict[str, Any]]:
        """Search documentation articles using manifest and file content."""
        results = []
        query_lower = query.lower()
        query_words = set(query_lower.split())

        # Load manifest
        manifest = await self._get_manifest()
        if not manifest:
            return results

        articles = manifest.get("articles", [])

        for article in articles:
            # Check if article supports the requested language
            if language not in article.get("languages", ["en"]):
                continue

            # Apply filters
            if category and article.get("category") != category:
                continue

            if audience:
                article_audiences = article.get("audiences", ["user"])
                if audience not in article_audiences:
                    continue

            if platform:
                article_platforms = article.get("platforms", ["all"])
                if "all" not in article_platforms and platform not in article_platforms:
                    continue

            # Calculate relevance score
            score = self._calculate_article_score(article, query_lower, query_words)

            if score > 0:
                results.append(
                    {
                        "id": article["id"],
                        "slug": article["slug"],
                        "title_key": article["title_key"],
                        "category": article["category"],
                        "subcategory": article.get("subcategory"),
                        "difficulty": article.get("difficulty", "beginner"),
                        "platforms": article.get("platforms", ["all"]),
                        "score": score,
                        "type": "article",
                    }
                )

        # Sort by relevance score
        results.sort(key=lambda x: x["score"], reverse=True)

        return results[:limit]

    def _calculate_article_score(
        self,
        article: Dict,
        query_lower: str,
        query_words: set,
    ) -> float:
        """Calculate relevance score for an article."""
        score = 0.0

        # Check keywords (high weight)
        keywords = article.get("keywords", [])
        keywords_lower = [k.lower() for k in keywords]

        for word in query_words:
            if word in keywords_lower:
                score += 10.0
            elif any(word in kw for kw in keywords_lower):
                score += 5.0

        # Check slug (medium weight)
        slug = article.get("slug", "").lower()
        for word in query_words:
            if word in slug:
                score += 3.0

        # Check title key for hints (lower weight)
        title_key = article.get("title_key", "").lower()
        for word in query_words:
            if word in title_key:
                score += 2.0

        # Check category match
        category = article.get("category", "").lower()
        if query_lower in category:
            score += 2.0

        # Boost featured articles
        if article.get("is_featured"):
            score *= 1.2

        return score

    async def _search_faq(
        self,
        query: str,
        language: str,
        category: Optional[str],
        limit: int,
    ) -> List[Dict[str, Any]]:
        """Search FAQ entries."""
        results = []
        query_lower = query.lower()
        query_words = set(query_lower.split())

        # Build query
        faq_query = FAQEntry.find(FAQEntry.is_active == True)  # noqa: E712

        if category:
            faq_query = faq_query.find(FAQEntry.category == category)

        entries = await faq_query.to_list()

        for entry in entries:
            trans = entry.translations.get(language, {})
            if not trans:
                continue

            question = trans.get("question", "")
            answer = trans.get("answer", "")

            # Calculate relevance score
            score = self._calculate_faq_score(
                question=question,
                answer=answer,
                query_lower=query_lower,
                query_words=query_words,
                is_featured=entry.is_featured,
            )

            if score > 0:
                results.append(
                    {
                        "id": str(entry.id),
                        "question": question,
                        "answer": answer,
                        "category": entry.category,
                        "views": entry.views,
                        "helpful_yes": entry.helpful_yes,
                        "helpful_no": entry.helpful_no,
                        "score": score,
                        "type": "faq",
                    }
                )

        # Sort by relevance score
        results.sort(key=lambda x: x["score"], reverse=True)

        return results[:limit]

    def _calculate_faq_score(
        self,
        question: str,
        answer: str,
        query_lower: str,
        query_words: set,
        is_featured: bool,
    ) -> float:
        """Calculate relevance score for a FAQ entry."""
        score = 0.0
        question_lower = question.lower()
        answer_lower = answer.lower()

        # Exact phrase match in question (highest weight)
        if query_lower in question_lower:
            score += 20.0

        # Exact phrase match in answer (high weight)
        if query_lower in answer_lower:
            score += 10.0

        # Word matches in question
        for word in query_words:
            if len(word) >= 3:  # Skip very short words
                if word in question_lower:
                    score += 5.0

        # Word matches in answer
        for word in query_words:
            if len(word) >= 3:
                if word in answer_lower:
                    score += 2.0

        # Boost featured entries
        if is_featured:
            score *= 1.3

        return score

    async def _get_manifest(self) -> Optional[Dict]:
        """Get the documentation manifest, with caching."""
        now = datetime.now(timezone.utc)

        # Check cache
        if self._manifest_cache and self._manifest_loaded_at:
            age = (now - self._manifest_loaded_at).total_seconds()
            if age < self._cache_ttl_seconds:
                return self._manifest_cache

        # Load from file
        try:
            manifest_path = (
                Path(__file__).parent.parent.parent.parent
                / "shared"
                / "data"
                / "support"
                / "docs"
                / "manifest.json"
            )

            if manifest_path.exists():
                with open(manifest_path, "r", encoding="utf-8") as f:
                    self._manifest_cache = json.load(f)
                    self._manifest_loaded_at = now
                    return self._manifest_cache
        except Exception as e:
            logger.error(f"Error loading docs manifest: {e}")

        return None

    async def _log_search(
        self,
        query: str,
        language: str,
        results_count: int,
        user_id: Optional[str],
        session_id: Optional[str],
        category_filter: Optional[str],
        audience_filter: Optional[str],
    ) -> None:
        """Log a search query for analytics."""
        try:
            log_entry = DocumentationSearchLog(
                query=query,
                language=language,
                user_id=user_id,
                session_id=session_id,
                results_count=results_count,
                category_filter=category_filter,
                audience_filter=audience_filter,
            )
            await log_entry.insert()
        except Exception as e:
            # Don't fail the search if logging fails
            logger.warning(f"Failed to log search: {e}")

    async def get_popular_searches(
        self,
        language: str = "en",
        limit: int = 10,
        days: int = 7,
    ) -> List[Dict[str, Any]]:
        """Get popular search queries from the last N days."""
        from datetime import timedelta

        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        # Aggregate searches
        pipeline = [
            {
                "$match": {
                    "language": language,
                    "created_at": {"$gte": cutoff},
                }
            },
            {
                "$group": {
                    "_id": {"$toLower": "$query"},
                    "count": {"$sum": 1},
                    "avg_results": {"$avg": "$results_count"},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]

        try:
            results = await DocumentationSearchLog.aggregate(pipeline).to_list()
            return [
                {
                    "query": r["_id"],
                    "count": r["count"],
                    "avg_results": round(r["avg_results"], 1),
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error getting popular searches: {e}")
            return []

    async def get_zero_result_searches(
        self,
        language: str = "en",
        limit: int = 20,
        days: int = 7,
    ) -> List[Dict[str, Any]]:
        """Get searches that returned zero results (for content gap analysis)."""
        from datetime import timedelta

        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        pipeline = [
            {
                "$match": {
                    "language": language,
                    "created_at": {"$gte": cutoff},
                    "results_count": 0,
                }
            },
            {
                "$group": {
                    "_id": {"$toLower": "$query"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": limit},
        ]

        try:
            results = await DocumentationSearchLog.aggregate(pipeline).to_list()
            return [
                {
                    "query": r["_id"],
                    "count": r["count"],
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error getting zero-result searches: {e}")
            return []

    async def get_article_content(
        self,
        slug: str,
        language: str = "en",
    ) -> Optional[Dict[str, Any]]:
        """Get full article content by slug."""
        try:
            docs_path = (
                Path(__file__).parent.parent.parent.parent
                / "shared"
                / "data"
                / "support"
                / "docs"
            )
            article_path = docs_path / language / f"{slug}.md"

            if not article_path.exists():
                return None

            # Security check - ensure path is within docs directory
            try:
                article_path.resolve().relative_to(docs_path.resolve())
            except ValueError:
                return None

            with open(article_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Get metadata from manifest
            manifest = await self._get_manifest()
            metadata = {}
            if manifest:
                for article in manifest.get("articles", []):
                    if article.get("slug") == slug:
                        metadata = article
                        break

            return {
                "slug": slug,
                "language": language,
                "content": content,
                "metadata": metadata,
            }

        except Exception as e:
            logger.error(f"Error getting article content: {e}")
            return None


# Singleton instance
docs_search_service = DocsSearchService()
