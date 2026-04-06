"""Generate draft questions for all moments + memory demo via Claude."""

import json

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.scripts.speaker_qa.models import DraftQuestion, SpeakerConfig

logger = get_logger(__name__)

_SYSTEM_PROMPT = (
    "You generate audience questions for an interactive educational video demo. "
    "Questions should be curious, natural, varied in length, and distinct — no "
    "duplicates across moments. Keep each question under 15 words.\n\n"
    "Output ONLY strict JSON matching this shape:\n"
    '{"moment_questions": [{"timestamp": <float>, "questions": [<str>, <str>, <str>]}],\n'
    ' "memory_demo_questions": [<str>, <str>, <str>]}\n\n'
    "- One object per moment in the input, with exactly question_count questions each\n"
    "- memory_demo_questions: 3 questions where Q2 and Q3 are natural followups to Q1\n"
    "  (they should invite callbacks to Q1's topic)\n"
)


def _strip_markdown(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return raw


async def generate_draft_questions(cfg: SpeakerConfig) -> list[DraftQuestion]:
    """Call Claude to draft all questions for a speaker config."""
    moment_blocks = "\n\n".join(
        f"Moment at timestamp={m.timestamp}:\n"
        f"  scene_context: {m.scene_context}\n"
        f"  interaction_prompt: {m.interaction_prompt}\n"
        f"  question_count: {m.question_count}"
        for m in cfg.moments
    )
    memory_block = (
        f"Memory demo seed:\n"
        f"  Q1 (use verbatim): {cfg.memory_demo.seed_question}\n"
        f"  Q2 hint: {cfg.memory_demo.followup_hint}\n"
        f"  Q3 hint: {cfg.memory_demo.third_question_hint}"
    )
    user_prompt = (
        f"Speaker persona:\n{cfg.persona_prompt}\n\n"
        f"Answer style: {cfg.answer_style} "
        f"(max {cfg.style_rules.max_answer_words} words per answer)\n"
        f"Forbidden topics: {', '.join(cfg.style_rules.forbid_topics)}\n\n"
        f"Moments:\n{moment_blocks}\n\n{memory_block}"
    )

    client = get_anthropic_client()
    response = await client.messages.create(
        model=settings.MOVIE_INTERACTION_AI_MODEL,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
        max_tokens=2000,
    )
    raw = _strip_markdown(response.content[0].text)
    data = json.loads(raw)

    drafts: list[DraftQuestion] = []
    for moment_out in data["moment_questions"]:
        ts = float(moment_out["timestamp"])
        for idx, text in enumerate(moment_out["questions"]):
            drafts.append(DraftQuestion(
                moment_timestamp=ts, index_in_moment=idx,
                text=str(text), is_memory_demo=False,
            ))
    mem_qs = list(data["memory_demo_questions"])
    mem_qs[0] = cfg.memory_demo.seed_question
    for idx, text in enumerate(mem_qs[:3]):
        drafts.append(DraftQuestion(
            moment_timestamp=None, index_in_moment=idx,
            text=str(text), is_memory_demo=True,
        ))

    logger.info(
        "Generated draft questions",
        extra={
            "speaker_id": cfg.speaker_id,
            "static_count": sum(1 for d in drafts if not d.is_memory_demo),
            "memory_demo_count": sum(1 for d in drafts if d.is_memory_demo),
        },
    )
    return drafts
