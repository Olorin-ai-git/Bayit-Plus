"""
Trivia to Quiz Converter Service.
Converts trivia facts into multiple-choice quiz questions.
"""

import logging
import random
from typing import List, Optional

from app.models.content import Content
from app.models.trivia import TriviaFactModel

logger = logging.getLogger(__name__)


async def convert_trivia_to_quiz(
    facts: List[TriviaFactModel],
    content: Content,
    language: str = "he"
) -> List[dict]:
    """
    Convert trivia facts into quiz questions.

    Args:
        facts: List of trivia facts
        content: Content item
        language: Preferred language

    Returns:
        List of quiz question dictionaries
    """
    questions = []

    # Select up to 5 facts for quiz generation
    selected_facts = random.sample(facts, min(5, len(facts)))

    for fact in selected_facts:
        # Get the fact text in the preferred language
        fact_text = _get_localized_text(fact, language)

        if not fact_text:
            continue

        # Generate a question from the fact
        question = await _generate_question_from_fact(fact, content, language)

        if question:
            questions.append(question)

    return questions


def _get_localized_text(fact: TriviaFactModel, language: str) -> Optional[str]:
    """Get fact text in the preferred language."""
    if language == "he":
        return fact.text_he or fact.text or fact.text_en
    elif language == "en":
        return fact.text_en or fact.text or fact.text_he
    elif language == "es":
        return fact.text_es or fact.text_en or fact.text
    else:
        return fact.text or fact.text_en or fact.text_he


async def _generate_question_from_fact(
    fact: TriviaFactModel,
    content: Content,
    language: str
) -> Optional[dict]:
    """
    Generate a multiple-choice question from a trivia fact.

    This is a simple implementation that creates questions based on fact categories.
    For production, this should use an LLM to generate better questions and distractors.
    """
    fact_text = _get_localized_text(fact, language)

    if not fact_text:
        return None

    # Extract key information from the fact
    category = fact.category or "general"

    # For now, create a simple true/false or fill-in-the-blank style question
    # In production, use Claude/GPT to generate better questions

    # Example: Convert "This movie was directed by Steven Spielberg in 1993"
    # into "Who directed this movie?" with multiple choice answers

    question_templates = {
        "he": {
            "director": "מי ביים את הסרט הזה?",
            "cast": "מי שיחק בסרט הזה?",
            "year": "באיזו שנה יצא הסרט?",
            "genre": "מהו הז'אנר של הסרט?",
            "general": f"האם זה נכון? {fact_text}",
        },
        "en": {
            "director": "Who directed this movie?",
            "cast": "Who starred in this movie?",
            "year": "When was this movie released?",
            "genre": "What genre is this movie?",
            "general": f"Is this true? {fact_text}",
        },
        "es": {
            "director": "¿Quién dirigió esta película?",
            "cast": "¿Quién protagonizó esta película?",
            "year": "¿Cuándo se estrenó esta película?",
            "genre": "¿Cuál es el género de esta película?",
            "general": f"¿Es esto cierto? {fact_text}",
        }
    }

    lang_templates = question_templates.get(language, question_templates["en"])

    # Generate question based on content metadata
    if category == "director" and content.director:
        question_text = lang_templates.get("director", lang_templates["general"])
        correct_answer = content.director
        options = _generate_director_distractors(correct_answer, language)
    elif category == "cast" and content.cast:
        question_text = lang_templates.get("cast", lang_templates["general"])
        correct_answer = content.cast[0] if content.cast else ""
        options = _generate_cast_distractors(correct_answer, language)
    elif category == "year" and content.year:
        question_text = lang_templates.get("year", lang_templates["general"])
        correct_answer = str(content.year)
        options = _generate_year_distractors(content.year)
    elif category == "genre" and content.genre:
        question_text = lang_templates.get("genre", lang_templates["general"])
        correct_answer = content.genre
        options = _generate_genre_distractors(correct_answer, language)
    else:
        # True/False question from fact
        question_text = lang_templates["general"]
        true_text = {"he": "נכון", "en": "True", "es": "Verdadero"}.get(language, "True")
        false_text = {"he": "לא נכון", "en": "False", "es": "Falso"}.get(language, "False")
        options = [true_text, false_text]
        correct_answer = true_text
        correct_index = 0

    if not options or correct_answer not in options:
        return None

    # Ensure correct answer is in options and shuffle
    if correct_answer not in options:
        options[0] = correct_answer

    correct_index = options.index(correct_answer)

    # Shuffle options
    shuffled_indices = list(range(len(options)))
    random.shuffle(shuffled_indices)
    shuffled_options = [options[i] for i in shuffled_indices]
    new_correct_index = shuffled_indices.index(correct_index)

    return {
        "id": str(fact.id),
        "question": question_text,
        "text": question_text,
        "options": shuffled_options,
        "correctIndex": new_correct_index,
        "correct_index": new_correct_index,
        "category": category,
        "explanation": fact_text
    }


def _generate_director_distractors(correct: str, language: str) -> List[str]:
    """Generate plausible director names as distractors."""
    famous_directors = {
        "en": ["Steven Spielberg", "Martin Scorsese", "Christopher Nolan", "Quentin Tarantino"],
        "he": ["סטיבן ספילברג", "מרטין סקורסזה", "כריסטופר נולן", "קוונטין טרנטינו"],
        "es": ["Steven Spielberg", "Martin Scorsese", "Christopher Nolan", "Quentin Tarantino"]
    }

    distractors = famous_directors.get(language, famous_directors["en"])
    # Remove correct answer if it's in the list
    distractors = [d for d in distractors if d.lower() != correct.lower()]

    # Select 3 random distractors
    selected = random.sample(distractors, min(3, len(distractors)))
    return [correct] + selected


def _generate_cast_distractors(correct: str, language: str) -> List[str]:
    """Generate plausible actor names as distractors."""
    famous_actors = {
        "en": ["Tom Hanks", "Meryl Streep", "Leonardo DiCaprio", "Brad Pitt", "Jennifer Lawrence"],
        "he": ["טום הנקס", "מריל סטריפ", "לאונרדו דיקפריו", "בראד פיט", "ג'ניפר לורנס"],
        "es": ["Tom Hanks", "Meryl Streep", "Leonardo DiCaprio", "Brad Pitt", "Jennifer Lawrence"]
    }

    distractors = famous_actors.get(language, famous_actors["en"])
    distractors = [d for d in distractors if d.lower() != correct.lower()]

    selected = random.sample(distractors, min(3, len(distractors)))
    return [correct] + selected


def _generate_year_distractors(correct_year: int) -> List[str]:
    """Generate plausible years around the correct year."""
    options = [str(correct_year)]

    # Add years within 5 years before and after
    possible_years = [y for y in range(correct_year - 5, correct_year + 6) if y != correct_year]
    options.extend([str(y) for y in random.sample(possible_years, min(3, len(possible_years)))])

    return options


def _generate_genre_distractors(correct: str, language: str) -> List[str]:
    """Generate plausible genre names as distractors."""
    genres = {
        "en": ["Action", "Drama", "Comedy", "Thriller", "Sci-Fi", "Horror", "Romance", "Documentary"],
        "he": ["פעולה", "דרמה", "קומדיה", "מתח", "מדע בדיוני", "אימה", "רומנטי", "תיעודי"],
        "es": ["Acción", "Drama", "Comedia", "Suspenso", "Ciencia Ficción", "Terror", "Romance", "Documental"]
    }

    genre_list = genres.get(language, genres["en"])
    distractors = [g for g in genre_list if g.lower() != correct.lower()]

    selected = random.sample(distractors, min(3, len(distractors)))
    return [correct] + selected
