"""
Comprehension Question Generation Prompts.

Claude prompts for generating scene-based comprehension questions.
"""


def build_comprehension_question_prompt(
    scene_context: str,
    chapter_title: str,
    content_title: str,
    language: str,
) -> str:
    """
    Build prompt for comprehension question generation.

    Args:
        scene_context: Subtitle text from the scene
        chapter_title: Chapter/section title (if available)
        content_title: Full content title
        language: Target language code (he, en)

    Returns:
        Formatted prompt for Claude
    """
    lang_name = "Hebrew" if language == "he" else "English"

    prompt = f"""Based on this {lang_name} dialogue:

"{scene_context}"

From the content: "{content_title}"
{f'Chapter: "{chapter_title}"' if chapter_title else ''}

Create a comprehension question in {lang_name} that tests whether the viewer understood what happened in this scene. The question should:

1. Focus on plot events, character motivations, or key dialogue
2. Have 4 multiple choice options (A, B, C, D)
3. Only one correct answer
4. Be answerable from the scene alone (no external knowledge required)
5. Test understanding, not trivia

Response format (JSON):
{{
  "question": "{lang_name} question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_index": 0,
  "explanation": "Why this is the correct answer (brief)"
}}

Ensure all text is in {lang_name}."""

    return prompt


def build_translation_prompt(
    text: str, source_lang: str, target_lang: str
) -> str:
    """
    Build prompt for translating question/options.

    Args:
        text: Text to translate (JSON structure)
        source_lang: Source language code
        target_lang: Target language code

    Returns:
        Formatted translation prompt
    """
    source_name = "Hebrew" if source_lang == "he" else "English"
    target_name = "Hebrew" if target_lang == "he" else "English"

    prompt = f"""Translate this comprehension question from {source_name} to {target_name}.

Maintain the JSON structure exactly. Translate all text fields.

Original ({source_name}):
{text}

Provide the translation in valid JSON format with the same structure."""

    return prompt
