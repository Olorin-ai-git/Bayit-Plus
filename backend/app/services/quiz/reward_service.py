"""
Reward Service.

Manages points, badges, and streaks for the kids quiz feature.
Split into separate concerns following SOLID principles.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import pytz

from app.core.config import settings
from app.models.quiz import ContentQuiz, QuizQuestionModel
from app.models.quiz_attempt import QuizAnswerRecord, QuizAttempt
from app.models.reward import Badge, BadgeResponse, UserReward

logger = logging.getLogger(__name__)


class RewardCalculationService:
    """Pure domain logic for score and points calculation."""

    def calculate_score(
        self,
        quiz: ContentQuiz,
        answers: List[int],
    ) -> Tuple[int, int, float, List[QuizAnswerRecord]]:
        """
        Calculate quiz score and points.

        Returns:
            Tuple of (correct_count, total_points, percentage, answer_records)
        """
        correct_count = 0
        total_points = 0
        answer_records = []

        for idx, (question, selected) in enumerate(
            zip(quiz.questions, answers)
        ):
            is_correct = selected == question.correct_index
            points = question.points if is_correct else 0

            if is_correct:
                correct_count += 1
                total_points += points

            answer_records.append(
                QuizAnswerRecord(
                    question_index=idx,
                    selected_option=selected,
                    is_correct=is_correct,
                    time_taken_ms=0,
                    points_earned=points,
                )
            )

        percentage = (correct_count / len(quiz.questions)) * 100

        if correct_count == len(quiz.questions):
            total_points += settings.QUIZ_PERFECT_BONUS

        return correct_count, total_points, percentage, answer_records


class BadgeAwardService:
    """Badge eligibility checking and awarding."""

    async def check_and_award_badges(
        self,
        user_reward: UserReward,
        is_perfect: bool,
    ) -> List[Badge]:
        """
        Check badge eligibility and award new badges.

        Returns:
            List of newly earned badges
        """
        new_badges = []
        all_badges = await Badge.find({"is_active": True}).to_list()
        today = datetime.utcnow().strftime("%Y-%m-%d")

        for badge in all_badges:
            if badge.badge_id in user_reward.earned_badges:
                continue

            if self._check_badge_eligibility(user_reward, badge, is_perfect):
                new_badges.append(badge)
                user_reward.earned_badges.append(badge.badge_id)
                user_reward.badge_earned_dates[badge.badge_id] = today
                user_reward.total_points += badge.points_bonus

                logger.info(
                    "Badge awarded",
                    extra={
                        "user_id": user_reward.user_id,
                        "profile_id": user_reward.profile_id,
                        "badge_id": badge.badge_id,
                    },
                )

        return new_badges

    def _check_badge_eligibility(
        self,
        reward: UserReward,
        badge: Badge,
        is_perfect: bool,
    ) -> bool:
        """Check if user meets badge requirements."""
        requirement = badge.requirement_type
        value = badge.requirement_value

        if requirement == "quizzes_completed":
            return reward.quizzes_completed >= value
        elif requirement == "perfect_scores":
            return reward.perfect_scores >= value
        elif requirement == "streak_days":
            return reward.current_streak >= value
        elif requirement == "total_points":
            return reward.total_points >= value

        return False


class StreakService:
    """Timezone-aware streak calculation."""

    def update_streak(
        self,
        user_reward: UserReward,
        completed_at: datetime,
    ) -> None:
        """
        Update user's streak based on completion time.

        Uses user's timezone for accurate day calculation.
        """
        tz = pytz.timezone(user_reward.streak_timezone)
        local_time = completed_at.astimezone(tz)
        today_str = local_time.strftime("%Y-%m-%d")

        if user_reward.last_quiz_date is None:
            user_reward.current_streak = 1
        elif user_reward.last_quiz_date == today_str:
            pass
        else:
            last_date = datetime.strptime(
                user_reward.last_quiz_date, "%Y-%m-%d"
            )
            last_date = tz.localize(last_date)
            today_date = datetime.strptime(today_str, "%Y-%m-%d")
            today_date = tz.localize(today_date)

            days_diff = (today_date - last_date).days

            if days_diff == 1:
                user_reward.current_streak += 1
            else:
                user_reward.current_streak = 1

        user_reward.last_quiz_date = today_str
        user_reward.longest_streak = max(
            user_reward.longest_streak, user_reward.current_streak
        )


class RewardService:
    """Orchestrates reward processing for quiz results."""

    def __init__(self):
        self.calculator = RewardCalculationService()
        self.badge_service = BadgeAwardService()
        self.streak_service = StreakService()

    async def process_quiz_result(
        self,
        user_id: str,
        profile_id: Optional[str],
        quiz: ContentQuiz,
        answers: List[int],
        time_taken_per_question_ms: Optional[List[int]] = None,
    ) -> Dict:
        """
        Process quiz submission and return results.

        Args:
            user_id: User ID
            profile_id: Profile ID (for kids profiles)
            quiz: The quiz that was completed
            answers: List of selected answer indices
            time_taken_per_question_ms: Optional timing data

        Returns:
            Dict with score, points, badges, and attempt info
        """
        if len(answers) != len(quiz.questions):
            raise ValueError(
                f"Expected {len(quiz.questions)} answers, got {len(answers)}"
            )

        correct, points, percentage, answer_records = (
            self.calculator.calculate_score(quiz, answers)
        )

        if time_taken_per_question_ms:
            for i, record in enumerate(answer_records):
                if i < len(time_taken_per_question_ms):
                    record.time_taken_ms = time_taken_per_question_ms[i]

        total_time_ms = sum(r.time_taken_ms for r in answer_records)
        is_perfect = correct == len(quiz.questions)

        user_reward = await self._get_or_create_reward(user_id, profile_id)

        now = datetime.utcnow()
        self.streak_service.update_streak(user_reward, now)

        user_reward.total_points += points
        user_reward.quizzes_completed += 1
        if is_perfect:
            user_reward.perfect_scores += 1
        user_reward.updated_at = now

        new_badges = await self.badge_service.check_and_award_badges(
            user_reward, is_perfect
        )

        await user_reward.save()

        attempt = QuizAttempt(
            user_id=user_id,
            profile_id=profile_id,
            quiz_id=str(quiz.id),
            content_id=quiz.content_id,
            content_type=quiz.content_type,
            answers=answer_records,
            total_questions=len(quiz.questions),
            correct_answers=correct,
            score=percentage,
            points_earned=points,
            badges_earned=[b.badge_id for b in new_badges],
            started_at=now,
            completed_at=now,
            total_time_ms=total_time_ms,
        )
        await attempt.insert()

        badge_responses = [
            BadgeResponse(
                badge_id=b.badge_id,
                name=b.name,
                name_he=b.name_he,
                description=b.description,
                description_he=b.description_he,
                icon_url=b.icon_url,
                rarity=b.rarity,
                points_bonus=b.points_bonus,
                earned=True,
                earned_date=datetime.utcnow().strftime("%Y-%m-%d"),
            )
            for b in new_badges
        ]

        return {
            "attempt_id": str(attempt.id),
            "score": percentage,
            "correct_answers": correct,
            "total_questions": len(quiz.questions),
            "points_earned": points,
            "new_badges": [b.model_dump() for b in badge_responses],
            "total_points": user_reward.total_points,
            "streak_days": user_reward.current_streak,
            "is_perfect": is_perfect,
        }

    async def _get_or_create_reward(
        self,
        user_id: str,
        profile_id: Optional[str],
    ) -> UserReward:
        """Get or create user reward document."""
        existing = await UserReward.find_one(
            {"user_id": user_id, "profile_id": profile_id}
        )
        if existing:
            return existing

        reward = UserReward(user_id=user_id, profile_id=profile_id)
        await reward.insert()
        return reward

    async def get_user_rewards(
        self,
        user_id: str,
        profile_id: Optional[str],
    ) -> Optional[UserReward]:
        """Get user rewards for a specific profile."""
        return await UserReward.find_one(
            {"user_id": user_id, "profile_id": profile_id}
        )

    async def get_all_badges(self) -> List[Badge]:
        """Get all active badge definitions."""
        return await Badge.find({"is_active": True}).to_list()
