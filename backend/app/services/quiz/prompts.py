"""
Kids-Safe AI Prompt Templates for Quiz Generation.

These prompts are designed to generate age-appropriate, encouraging,
and educational quiz questions for children ages 0-12.
"""

AGE_GROUP_CONFIG = {
    "toddlers": {
        "age_min": 0,
        "age_max": 3,
        "vocabulary": "very simple",
        "focus": "colors, shapes, characters, animals, counting to 5",
        "num_questions": 3,
        "difficulty": "easy",
    },
    "preschool": {
        "age_min": 3,
        "age_max": 5,
        "vocabulary": "simple",
        "focus": "characters, colors, songs, emotions, simple actions",
        "num_questions": 5,
        "difficulty": "easy",
    },
    "elementary": {
        "age_min": 6,
        "age_max": 9,
        "vocabulary": "age-appropriate",
        "focus": "plot, characters, lessons, fun facts, sequences",
        "num_questions": 7,
        "difficulty": "medium",
    },
    "preteen": {
        "age_min": 9,
        "age_max": 12,
        "vocabulary": "intermediate",
        "focus": "plot details, character motivations, themes, trivia",
        "num_questions": 10,
        "difficulty": "mixed",
    },
}


def get_kids_quiz_prompt(
    title: str,
    context: str,
    age_group: str,
    language: str = "he",
    num_questions: int = 5,
) -> str:
    """
    Generate a kids-safe quiz prompt for the specified age group.

    Args:
        title: Content title
        context: TMDB context (plot, cast, etc.)
        age_group: One of toddlers, preschool, elementary, preteen
        language: Primary language (he, en, etc.)
        num_questions: Number of questions to generate

    Returns:
        Formatted prompt string for Claude
    """
    config = AGE_GROUP_CONFIG.get(age_group, AGE_GROUP_CONFIG["elementary"])

    language_instruction = ""
    if language == "he":
        language_instruction = """
LANGUAGE: Hebrew (עברית)
- Write questions and answers in Hebrew
- Use age-appropriate Hebrew vocabulary
- For young children (toddlers/preschool), use very simple words
- Avoid complex Hebrew conjugations for younger ages
"""
    else:
        language_instruction = f"""
LANGUAGE: {language.upper()}
- Write questions and answers in {language}
- Use age-appropriate vocabulary for the target age
"""

    return f"""You are a friendly, encouraging quiz creator for children aged {config['age_min']}-{config['age_max']}.

Create {num_questions} fun multiple-choice questions about this movie/show that children just watched.

IMPORTANT RULES FOR KIDS QUIZZES:
1. VOCABULARY: Use {config['vocabulary']} words appropriate for ages {config['age_min']}-{config['age_max']}
2. TONE: Be encouraging, fun, and positive - never scary or negative
3. FOCUS: Questions about {config['focus']}
4. OPTIONS: Each question has exactly 4 answer options (A, B, C, D)
5. CLARITY: Each option should be clearly different - no confusing similar answers
6. FAIRNESS: No trick questions - the correct answer should be obvious if the child watched
7. SAFETY: No questions about violence, danger, or anything inappropriate for children
8. ENCOURAGEMENT: Questions should make children feel smart and successful
{language_instruction}

CONTENT TITLE: {title}
CONTENT CONTEXT:
{context}

DIFFICULTY LEVEL: {config['difficulty']}
- easy: Basic recall questions (colors, names, simple events)
- medium: Understanding questions (why something happened, character feelings)
- hard: Analysis questions (themes, comparisons, predictions)

OUTPUT FORMAT:
Return ONLY a valid JSON array with no additional text. Each question must follow this exact structure:
[
  {{
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "difficulty": "easy",
    "explanation": "Brief explanation why this is correct"
  }}
]

CRITICAL:
- correct_index is 0-3 (0 for first option, 3 for last)
- Return ONLY the JSON array, no markdown code blocks, no explanation text
- Generate exactly {num_questions} questions
"""


def get_quiz_validation_prompt(quiz_json: str, age_group: str) -> str:
    """
    Generate a prompt to validate quiz content is kid-safe.

    Args:
        quiz_json: JSON string of generated quiz
        age_group: Target age group

    Returns:
        Validation prompt string
    """
    config = AGE_GROUP_CONFIG.get(age_group, AGE_GROUP_CONFIG["elementary"])

    return f"""Review this quiz for children aged {config['age_min']}-{config['age_max']}.

QUIZ TO REVIEW:
{quiz_json}

CHECK FOR:
1. Inappropriate content (violence, fear, adult themes)
2. Questions that are too difficult for the age group
3. Confusing or trick questions
4. Negative or discouraging language
5. Incorrect answers marked as correct
6. Options that are too similar

RESPOND WITH ONLY:
{{"valid": true}} if the quiz is appropriate
{{"valid": false, "issues": ["list of issues found"]}} if problems exist
"""


def determine_age_group(kids_age_limit: int) -> str:
    """
    Determine the age group from a profile's kids_age_limit.

    Args:
        kids_age_limit: Maximum age rating from profile (e.g., 3, 7, 12)

    Returns:
        Age group string (toddlers, preschool, elementary, preteen)
    """
    if kids_age_limit is None or kids_age_limit <= 3:
        return "toddlers"
    elif kids_age_limit <= 5:
        return "preschool"
    elif kids_age_limit <= 9:
        return "elementary"
    else:
        return "preteen"


def get_num_questions_for_age(age_group: str, max_questions: int = 10) -> int:
    """
    Get the recommended number of questions for an age group.

    Args:
        age_group: Target age group
        max_questions: Maximum configured questions

    Returns:
        Number of questions to generate
    """
    config = AGE_GROUP_CONFIG.get(age_group, AGE_GROUP_CONFIG["elementary"])
    return min(config["num_questions"], max_questions)
