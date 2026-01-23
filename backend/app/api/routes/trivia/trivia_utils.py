"""
Trivia API Utilities.
Helper functions for trivia response formatting.
"""

from app.models.trivia import ContentTrivia


def format_trivia_response(
    trivia: ContentTrivia, language: str, include_metadata: bool = False
) -> dict:
    """Format ContentTrivia document for API response."""
    facts = []
    for fact in trivia.facts:
        text = fact.text
        if language == "en" and fact.text_en:
            text = fact.text_en
        elif language == "es" and fact.text_es:
            text = fact.text_es

        fact_data = {
            "fact_id": fact.fact_id,
            "text": text,
            "trigger_time": fact.trigger_time,
            "trigger_type": fact.trigger_type,
            "category": fact.category,
            "display_duration": fact.display_duration,
            "priority": fact.priority,
        }

        if fact.related_person:
            fact_data["related_person"] = fact.related_person

        facts.append(fact_data)

    response = {
        "content_id": trivia.content_id,
        "content_type": trivia.content_type,
        "facts": facts,
        "fact_count": len(facts),
        "is_enriched": trivia.is_enriched,
    }

    if include_metadata:
        response["sources_used"] = trivia.sources_used
        response["tmdb_id"] = trivia.tmdb_id
        response["created_at"] = trivia.created_at.isoformat()
        response["updated_at"] = trivia.updated_at.isoformat()
        if trivia.enriched_at:
            response["enriched_at"] = trivia.enriched_at.isoformat()

    return response
