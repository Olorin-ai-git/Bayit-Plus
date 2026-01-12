"""
Content Auditor Service
AI-powered content validation using Claude API for classification verification
"""
import asyncio
import logging
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

import anthropic
from app.core.config import settings
from app.models.content import Content, Category
from app.models.librarian import LibrarianAction, ClassificationVerificationCache

logger = logging.getLogger(__name__)


@dataclass
class ClassificationVerification:
    """Result of a classification verification"""
    content_id: str
    fit_score: int  # 1-10
    is_correct: bool
    suggested_category: Optional[str] = None
    reasoning: Optional[str] = None


async def audit_content_items(
    content_ids: List[str],
    audit_id: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Audit content items for classification, metadata completeness, and quality.

    Args:
        content_ids: List of content IDs to audit
        audit_id: Parent audit report ID
        dry_run: If true, only report issues without fixing

    Returns:
        Dictionary with audit results
    """
    logger.info(f"📚 Auditing {len(content_ids)} content items...")

    results = {
        "status": "completed",
        "items_checked": len(content_ids),
        "missing_metadata": [],
        "misclassifications": [],
        "issues_found": 0,
    }

    if not content_ids:
        return results

    # Fetch all content items
    contents = await Content.find(
        {"_id": {"$in": content_ids}}
    ).to_list(length=None)

    logger.info(f"   Found {len(contents)} content items in database")

    # Check metadata completeness
    logger.info("   Checking metadata completeness...")
    missing_metadata = await check_metadata_completeness(contents)
    results["missing_metadata"] = missing_metadata

    # Verify classifications with AI
    logger.info("   Verifying classifications with Claude AI...")
    misclassifications = await verify_classifications(contents, audit_id)
    results["misclassifications"] = misclassifications

    # Auto-fix if not dry run
    if not dry_run and (missing_metadata or misclassifications):
        logger.info("   Auto-fixing issues...")
        from app.services.auto_fixer import fix_content_issues
        await fix_content_issues(missing_metadata, misclassifications, audit_id)

    results["issues_found"] = len(missing_metadata) + len(misclassifications)

    logger.info(f"   ✅ Content audit complete: {results['issues_found']} issues found")
    return results


async def check_metadata_completeness(contents: List[Content]) -> List[Dict[str, Any]]:
    """
    Check for missing or incomplete metadata.

    Checks:
    - Missing thumbnail/backdrop
    - Missing TMDB/IMDB data
    - Missing description
    - Empty cast/director for movies
    - Missing subtitles
    - Insufficient subtitle languages (minimum 3 for movies)
    """
    missing_metadata = []

    for content in contents:
        issues = []

        # Check thumbnail (None, empty string, or whitespace)
        if not content.thumbnail or not content.thumbnail.strip():
            issues.append("missing_thumbnail")

        # Check backdrop (None, empty string, or whitespace)
        if not content.backdrop or not content.backdrop.strip():
            issues.append("missing_backdrop")

        # Check TMDB ID
        if not content.tmdb_id:
            issues.append("missing_tmdb_id")

        # Movies should have IMDB ID
        if not content.is_series and (not content.imdb_id or not content.imdb_id.strip()):
            issues.append("missing_imdb_id")

        # Check description (None, empty, or too short)
        if not content.description or not content.description.strip() or len(content.description.strip()) < 20:
            issues.append("incomplete_description")

        # Check genre (None, empty string, or whitespace)
        if not content.genre or not content.genre.strip():
            issues.append("missing_genre")

        # Check subtitle availability
        if not content.has_subtitles:
            issues.append("missing_subtitles")

        # Check minimum subtitle language count for movies (3 languages required)
        if not content.is_series and len(content.available_subtitle_languages) < 3:
            issues.append("insufficient_subtitle_languages")

        if issues:
            missing_metadata.append({
                "content_id": str(content.id),
                "title": content.title,
                "issues": issues,
                "fixable": True,  # Can use TMDB to fix
            })

    logger.info(f"      Found {len(missing_metadata)} items with missing metadata")
    return missing_metadata


async def verify_classifications(
    contents: List[Content],
    audit_id: str
) -> List[Dict[str, Any]]:
    """
    Verify content classifications using Claude AI.

    Uses batch processing and caching to optimize API calls.
    """
    misclassifications = []

    # Group content by category for efficient batch processing
    category_groups: Dict[str, List[Content]] = {}
    for content in contents:
        if content.category_id not in category_groups:
            category_groups[content.category_id] = []
        category_groups[content.category_id].append(content)

    # Fetch all categories
    categories_dict = {}
    all_categories = await Category.find({}).to_list(length=None)
    for cat in all_categories:
        categories_dict[str(cat.id)] = cat

    # Verify each category group
    for category_id, group_contents in category_groups.items():
        category = categories_dict.get(category_id)
        if not category:
            logger.warning(f"⚠️ Category {category_id} not found")
            continue

        logger.info(f"      Verifying {len(group_contents)} items in category: {category.name}")

        # Check cache first
        cached_results, uncached_contents = await get_cached_verifications(
            group_contents, category_id
        )
        misclassifications.extend(cached_results)

        if not uncached_contents:
            continue

        # Batch process uncached items (50 at a time)
        batch_size = 50
        for i in range(0, len(uncached_contents), batch_size):
            batch = uncached_contents[i:i + batch_size]

            try:
                verifications = await verify_classification_batch(batch, category)

                # Process results
                for verification in verifications:
                    # Cache result
                    await cache_verification(verification, category_id)

                    # Add to misclassifications if needed
                    if not verification.is_correct and verification.fit_score < 6:
                        misclassifications.append({
                            "content_id": verification.content_id,
                            "current_category": category.name,
                            "suggested_category": verification.suggested_category,
                            "fit_score": verification.fit_score,
                            "reasoning": verification.reasoning,
                            "confidence": (10 - verification.fit_score) / 10.0,  # Inverse
                        })

            except Exception as e:
                logger.error(f"❌ Failed to verify batch: {e}")

            # Rate limiting
            await asyncio.sleep(0.5)

    logger.info(f"      Found {len(misclassifications)} potential misclassifications")
    return misclassifications


async def get_cached_verifications(
    contents: List[Content],
    category_id: str
) -> tuple[List[Dict[str, Any]], List[Content]]:
    """
    Check cache for existing verification results.

    Returns: (cached_misclassifications, uncached_contents)
    """
    cached_misclass = []
    uncached = []

    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    for content in contents:
        # Check if we have a recent verification
        cached = await ClassificationVerificationCache.find_one({
            "content_id": str(content.id),
            "category_id": category_id,
            "last_verified": {"$gte": seven_days_ago}
        })

        if cached:
            # Use cached result
            if not cached.is_correct and cached.fit_score < 6:
                cached_misclass.append({
                    "content_id": str(content.id),
                    "current_category": cached.category_name,
                    "suggested_category": cached.suggested_category_name,
                    "fit_score": cached.fit_score,
                    "reasoning": cached.reasoning,
                    "confidence": (10 - cached.fit_score) / 10.0,
                })
        else:
            uncached.append(content)

    return cached_misclass, uncached


async def verify_classification_batch(
    items: List[Content],
    category: Category
) -> List[ClassificationVerification]:
    """
    Batch verify if content items belong in their category using Claude AI.

    Processes up to 50 items per API call for cost efficiency.
    """
    if not items:
        return []

    # Prepare items for Claude
    items_data = []
    for item in items:
        items_data.append({
            "content_id": str(item.id),
            "title": item.title,
            "description": item.description[:200] if item.description else "",
            "genre": item.genre,
            "year": item.year,
            "is_series": item.is_series,
        })

    # Build prompt (Hebrew first, platform language)
    prompt = f"""אתה ספרן AI למערכת Bayit+, פלטפורמת סטרימינג ישראלית.

בדוק האם {len(items)} פריטי התוכן הבאים מסווגים נכון בקטגוריה.

**קטגוריה נוכחית:**
שם: {category.name}
שם באנגלית: {category.name_en or ""}
תיאור: {category.description or "לא זמין"}

**פריטי תוכן לבדיקה:**
{json.dumps(items_data, ensure_ascii=False, indent=2)}

**הוראות:**
עבור כל פריט, הערך:
1. **ציון התאמה** (1-10): עד כמה הפריט מתאים לקטגוריה
   - 1-3: לא מתאים בכלל, דורש שינוי קטגוריה
   - 4-6: מתאים באופן חלקי, כנראה יש קטגוריה טובה יותר
   - 7-8: מתאים היטב
   - 9-10: מתאים באופן מושלם

2. **האם הסיווג נכון?** true/false

3. **קטגוריה מוצעת**: אם הציון נמוך מ-7, הצע קטגוריה טובה יותר

4. **הסבר קצר**: נמק את ההחלטה

**החזר JSON בפורמט הבא:**
{{
    "verifications": [
        {{
            "content_id": "...",
            "fit_score": 8,
            "is_correct": true,
            "suggested_category": null,
            "reasoning": "סרט דרמה ישראלי, מתאים לקטגוריית סרטים"
        }}
    ]
}}

שים לב: התשובה צריכה להיות **רק** JSON, ללא טקסט נוסף."""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Parse JSON response
        response_text = response.content[0].text.strip()

        # Clean up response if needed
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        data = json.loads(response_text.strip())

        # Convert to ClassificationVerification objects
        verifications = []
        for v in data.get("verifications", []):
            verifications.append(ClassificationVerification(
                content_id=v.get("content_id", ""),
                fit_score=v.get("fit_score", 5),
                is_correct=v.get("is_correct", True),
                suggested_category=v.get("suggested_category"),
                reasoning=v.get("reasoning", ""),
            ))

        return verifications

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude response: {e}")
        logger.error(f"Response text: {response_text}")
        return []
    except Exception as e:
        logger.error(f"Error calling Claude API: {e}")
        return []


async def cache_verification(verification: ClassificationVerification, category_id: str):
    """Cache a verification result"""
    try:
        # Get content for additional info
        from beanie import PydanticObjectId
        content = await Content.get(PydanticObjectId(verification.content_id))
        if not content:
            return

        # Get category
        category = await Category.get(PydanticObjectId(category_id))

        cache_entry = ClassificationVerificationCache(
            content_id=verification.content_id,
            category_id=category_id,
            fit_score=verification.fit_score,
            is_correct=verification.is_correct,
            suggested_category_id=None,  # Would need lookup
            suggested_category_name=verification.suggested_category,
            reasoning=verification.reasoning,
            content_title=content.title,
            content_genre=content.genre,
            category_name=category.name if category else None,
            last_verified=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=7),
        )

        await cache_entry.insert()

    except Exception as e:
        logger.warning(f"Failed to cache verification: {e}")


async def generate_ai_insights(audit_report, language: str = "en") -> List[str]:
    """
    Generate AI-powered insights and recommendations from audit results.

    Uses Claude to analyze patterns and provide actionable recommendations.

    Args:
        audit_report: The audit report to analyze
        language: Language code (en, es, he) for insights
    """
    insights = []

    try:
        # Prepare audit summary for Claude
        summary_data = {
            "total_items": audit_report.summary.get("total_items", 0),
            "issues_found": audit_report.summary.get("issues_found", 0),
            "issues_fixed": audit_report.summary.get("issues_fixed", 0),
            "broken_streams_count": len(audit_report.broken_streams),
            "missing_metadata_count": len(audit_report.missing_metadata),
            "misclassifications_count": len(audit_report.misclassifications),
            "orphaned_items_count": len(audit_report.orphaned_items),
        }

        # Sample some issues for context
        sample_issues = {
            "broken_streams": audit_report.broken_streams[:5],
            "missing_metadata": audit_report.missing_metadata[:5],
            "misclassifications": audit_report.misclassifications[:3],
        }

        # Language-specific prompts
        prompts = {
            "en": f"""You are an AI librarian for the Bayit+ system. Analyze the following audit results and identify patterns and recommendations.

**Audit Summary:**
{json.dumps(summary_data, ensure_ascii=False, indent=2)}

**Sample Issues:**
{json.dumps(sample_issues, ensure_ascii=False, indent=2)}

**Instructions:**
1. Identify systemic patterns (e.g., all content from source X is broken)
2. Suggest recommendations to prevent future issues
3. Rank issues by severity
4. Identify opportunities to improve metadata quality

Return a list of insights and recommendations (3-5 items), each item one clear sentence.
Return JSON:
{{
    "insights": [
        "Insight 1...",
        "Insight 2...",
        "Recommendation 1..."
    ]
}}""",
            "es": f"""Eres un bibliotecario AI para el sistema Bayit+. Analiza los siguientes resultados de auditoría e identifica patrones y recomendaciones.

**Resumen de Auditoría:**
{json.dumps(summary_data, ensure_ascii=False, indent=2)}

**Ejemplos de Problemas:**
{json.dumps(sample_issues, ensure_ascii=False, indent=2)}

**Instrucciones:**
1. Identifica patrones sistémicos (p. ej., todo el contenido de la fuente X está roto)
2. Sugiere recomendaciones para prevenir problemas futuros
3. Clasifica los problemas por gravedad
4. Identifica oportunidades para mejorar la calidad de los metadatos

Devuelve una lista de ideas y recomendaciones (3-5 elementos), cada elemento una oración clara.
Devuelve JSON:
{{
    "insights": [
        "Idea 1...",
        "Idea 2...",
        "Recomendación 1..."
    ]
}}""",
            "he": f"""אתה ספרן AI למערכת Bayit+. נתח את תוצאות הביקורת הבאות וזהה דפוסים והמלצות.

**סיכום ביקורת:**
{json.dumps(summary_data, ensure_ascii=False, indent=2)}

**דוגמאות בעיות:**
{json.dumps(sample_issues, ensure_ascii=False, indent=2)}

**הוראות:**
1. זהה דפוסים מערכתיים (למשל: כל התוכן ממקור X שבור)
2. הצע המלצות למניעת בעיות עתידיות
3. דרג בעיות לפי חומרה
4. זהה הזדמנויות לשיפור איכות המטאדאטה

החזר רשימת תובנות והמלצות (3-5 פריטים), כל פריט משפט אחד ברור.
החזר JSON:
{{
    "insights": [
        "תובנה 1...",
        "תובנה 2...",
        "המלצה 1..."
    ]
}}"""
        }

        # Get prompt for requested language, fallback to English
        prompt = prompts.get(language, prompts["en"])

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = response.content[0].text.strip()

        # Clean up response
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        data = json.loads(response_text.strip())
        insights = data.get("insights", [])

    except Exception as e:
        logger.warning(f"Failed to generate AI insights: {e}")
        insights = []

    return insights
