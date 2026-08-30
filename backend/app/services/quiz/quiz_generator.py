"""
Quiz Generation Service.

Generates age-appropriate quiz questions for kids content using AI.
Follows TriviaGenerationService pattern for consistency.
"""

import json
import logging
from typing import List, Optional

from anthropic import AsyncAnthropic

from app.core.ai_clients import get_anthropic_client

from app.api.routes.content.utils import is_series_content
from app.core.config import settings
from app.models.content import Content
from app.models.profile import Profile
from app.models.quiz import ContentQuiz, QuizQuestionModel
from app.services.quiz.prompts import (
    determine_age_group,
    get_kids_quiz_prompt,
    get_num_questions_for_age,
)
from app.services.tmdb_service import TMDBService

logger = logging.getLogger(__name__)


class QuizGenerationService:
    """Service for generating and managing content quizzes."""

    def __init__(self):
        self.tmdb_service = TMDBService()
        self._anthropic_client: Optional[AsyncAnthropic] = None

    @property
    def anthropic_client(self) -> AsyncAnthropic:
        """Lazy initialization of Anthropic client."""
        if self._anthropic_client is None:
            if not settings.ANTHROPIC_API_KEY:
                raise ValueError("ANTHROPIC_API_KEY not configured")
            self._anthropic_client = get_anthropic_client(
                api_key=settings.ANTHROPIC_API_KEY
            )
        return self._anthropic_client

    async def get_or_generate_quiz(
        self,
        content: Content,
        profile: Profile,
        language: str = "he",
    ) -> Optional[ContentQuiz]:
        """
        Get cached quiz or generate new one for kids content.

        Args:
            content: Content document
            profile: User profile (must be kids profile)
            language: Primary language

        Returns:
            ContentQuiz or None if content is not eligible
        """
        if not content.is_kids_content:
            logger.debug(
                "Content not eligible for quiz - not kids content",
                extra={"content_id": str(content.id)},
            )
            return None

        if not profile.is_kids_profile:
            logger.debug(
                "Profile not eligible for quiz - not kids profile",
                extra={"profile_id": str(profile.id)},
            )
            return None

        existing = await ContentQuiz.get_for_content(
            str(content.id), language
        )
        if existing:
            return existing

        return await self.generate_quiz(content, profile, language)

    async def generate_quiz(
        self,
        content: Content,
        profile: Profile,
        language: str = "he",
    ) -> ContentQuiz:
        """
        Generate a new quiz for kids content.

        Pipeline:
        1. Fetch TMDB context (plot, cast, characters)
        2. Determine age group from profile
        3. Build kids-safe prompt
        4. Call Anthropic Claude
        5. Validate and save
        """
        age_group = determine_age_group(profile.kids_age_limit)
        num_questions = get_num_questions_for_age(
            age_group, settings.QUIZ_MAX_QUESTIONS
        )

        context = await self._fetch_content_context(content)

        prompt = get_kids_quiz_prompt(
            title=content.title,
            context=context,
            age_group=age_group,
            language=language,
            num_questions=num_questions,
        )

        questions = await self._generate_questions(
            prompt, age_group, num_questions
        )

        content_type = "series_episode" if is_series_content(content.model_dump()) else "vod"
        quiz = await ContentQuiz.create_or_update(
            content_id=str(content.id),
            content_type=content_type,
            questions=questions,
            age_group=age_group,
            language=language,
            generation_method="ai",
            tmdb_id=content.tmdb_id,
        )

        logger.info(
            "Generated quiz for kids content",
            extra={
                "content_id": str(content.id),
                "age_group": age_group,
                "num_questions": len(questions),
            },
        )

        return quiz

    async def _fetch_content_context(self, content: Content) -> str:
        """Fetch TMDB context for quiz generation."""
        context_parts = []

        context_parts.append(f"Title: {content.title}")
        if content.title_en:
            context_parts.append(f"English Title: {content.title_en}")

        if content.description:
            context_parts.append(f"Description: {content.description[:500]}")

        if content.tmdb_id:
            try:
                details = await self.tmdb_service.get_movie_details(
                    content.tmdb_id
                )
                if details:
                    if details.get("overview"):
                        context_parts.append(
                            f"Plot: {details['overview'][:500]}"
                        )
                    if details.get("genres"):
                        genres = [g["name"] for g in details["genres"][:5]]
                        context_parts.append(f"Genres: {', '.join(genres)}")
            except Exception as e:
                logger.warning(
                    "Failed to fetch TMDB details",
                    extra={
                        "content_id": str(content.id),
                        "tmdb_id": content.tmdb_id,
                        "error": str(e),
                    },
                )

        if content.content_rating:
            context_parts.append(f"Rating: {content.content_rating}")

        return "\n".join(context_parts)

    async def _generate_questions(
        self,
        prompt: str,
        age_group: str,
        expected_count: int,
    ) -> List[QuizQuestionModel]:
        """Generate quiz questions using Claude."""
        try:
            response = await self.anthropic_client.messages.create(
                model=settings.QUIZ_GENERATION_MODEL,
                max_tokens=settings.QUIZ_AI_MAX_TOKENS,
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = response.content[0].text.strip()

            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])

            questions_data = json.loads(response_text)

            questions = []
            for idx, q_data in enumerate(questions_data):
                try:
                    points = self._get_points_for_difficulty(
                        q_data.get("difficulty", "medium")
                    )
                    question = QuizQuestionModel(
                        question_text=q_data["question"],
                        options=q_data["options"],
                        correct_index=q_data["correct_index"],
                        difficulty=q_data.get("difficulty", "medium"),
                        points=points,
                        explanation=q_data.get("explanation"),
                    )
                    questions.append(question)
                except Exception as e:
                    logger.warning(
                        "Failed to parse question",
                        extra={"index": idx, "error": str(e)},
                    )

            if len(questions) < settings.QUIZ_MIN_QUESTIONS:
                logger.warning(
                    "Generated fewer questions than minimum",
                    extra={
                        "generated": len(questions),
                        "minimum": settings.QUIZ_MIN_QUESTIONS,
                    },
                )

            return questions[:settings.QUIZ_MAX_QUESTIONS]

        except json.JSONDecodeError as e:
            logger.error(
                "Failed to parse quiz JSON",
                extra={"error": str(e)},
            )
            raise ValueError("AI response was not valid JSON")
        except Exception as e:
            logger.error(
                "Quiz generation failed",
                extra={"error": str(e)},
            )
            raise

    def _get_points_for_difficulty(self, difficulty: str) -> int:
        """Get points value for question difficulty."""
        points_map = {
            "easy": settings.QUIZ_POINTS_EASY,
            "medium": settings.QUIZ_POINTS_MEDIUM,
            "hard": settings.QUIZ_POINTS_HARD,
        }
        return points_map.get(difficulty, settings.QUIZ_POINTS_MEDIUM)
