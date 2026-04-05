"""Comprehension Mode services (Phase 1 turn loop).

Stateless grader, in-character question generator, trigger policy, adapter.
Per Phase 1 decisions D-06..D-13 and Pitfalls 2, 3, 8.
"""
from app.services.olorin.comprehension.adapter import next_adapt_level
from app.services.olorin.comprehension.question_generator import (
    ComprehensionQuestionGeneration,
    comprehension_question_generator,
)
from app.services.olorin.comprehension.scorer import (
    RubricScoringService,
    rubric_scoring_service,
)
from app.services.olorin.comprehension.trigger import (
    ComprehensionTriggerPolicy,
    comprehension_trigger_policy,
)

__all__ = [
    "ComprehensionQuestionGeneration",
    "ComprehensionTriggerPolicy",
    "RubricScoringService",
    "comprehension_question_generator",
    "comprehension_trigger_policy",
    "next_adapt_level",
    "rubric_scoring_service",
]
