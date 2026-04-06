"""Generate persona-styled answers for draft questions via Claude.

5 calls per speaker (one per moment) + 1 call for memory-demo chain
(the 3 exchanges must be coherent so they need one prompt together).
"""

import json

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.scripts.speaker_qa.models import (
    CallbackAnnotation, DraftAnswer, DraftQuestion, SpeakerConfig,
)

logger = get_logger(__name__)


def _strip_markdown(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return raw


def _moment_system_prompt(cfg: SpeakerConfig) -> str:
    return (
        f"You answer questions in the voice of {cfg.character_name}.\n\n"
        f"Persona:\n{cfg.persona_prompt}\n\n"
        f"Style: {cfg.answer_style}\n"
        f"- Maximum {cfg.style_rules.max_answer_words} words per answer\n"
        f"- Anchor answers to the scene context (do not reference other moments)\n"
        f"- Forbidden topics: {', '.join(cfg.style_rules.forbid_topics) or '(none)'}\n\n"
        'Output ONLY strict JSON: {"answers": ["<a1>", "<a2>", "<a3>"]}'
    )


def _memory_system_prompt(cfg: SpeakerConfig) -> str:
    return (
        f"You answer questions in the voice of {cfg.character_name}.\n\n"
        f"Persona:\n{cfg.persona_prompt}\n\n"
        f"This is a 3-exchange conversation. Exchange 1 has no callback. "
        f"Exchanges 2 and 3 MUST explicitly reference wording or ideas from "
        f"exchange 1 to demonstrate memory. Each callback must identify the "
        f"exact phrase from the CURRENT answer that callbacks to exchange 1, "
        f"and the references_exchange MUST be 0 (pointing at exchange 1).\n\n"
        f"Style: {cfg.answer_style}\n"
        f"- Maximum {cfg.style_rules.max_answer_words} words per answer\n"
        f"- Forbidden topics: {', '.join(cfg.style_rules.forbid_topics) or '(none)'}\n\n"
        'Output ONLY strict JSON:\n'
        '{"exchanges": [\n'
        '  {"answer": "<a1>", "callback": null},\n'
        '  {"answer": "<a2>", "callback": {"phrase": "<from a2>", "references_exchange": 0}},\n'
        '  {"answer": "<a3>", "callback": {"phrase": "<from a3>", "references_exchange": 0}}\n'
        ']}'
    )


async def _answer_moment(cfg: SpeakerConfig, scene_context: str, questions: list[DraftQuestion]) -> list[DraftAnswer]:
    client = get_anthropic_client()
    q_block = "\n".join(f"Q{i+1}: {q.text}" for i, q in enumerate(questions))
    user_prompt = f"Scene context: {scene_context}\n\nAnswer each of these {len(questions)} questions in persona:\n{q_block}"
    resp = await client.messages.create(
        model=settings.MOVIE_INTERACTION_AI_MODEL,
        system=_moment_system_prompt(cfg),
        messages=[{"role": "user", "content": user_prompt}],
        max_tokens=1500,
    )
    data = json.loads(_strip_markdown(resp.content[0].text))
    return [DraftAnswer(question=q, response_text=str(a), callback=None) for q, a in zip(questions, data["answers"])]


async def _answer_memory_demo(cfg: SpeakerConfig, questions: list[DraftQuestion]) -> list[DraftAnswer]:
    client = get_anthropic_client()
    q_block = "\n".join(f"Q{i+1}: {q.text}" for i, q in enumerate(questions))
    resp = await client.messages.create(
        model=settings.MOVIE_INTERACTION_AI_MODEL,
        system=_memory_system_prompt(cfg),
        messages=[{"role": "user", "content": q_block}],
        max_tokens=1500,
    )
    data = json.loads(_strip_markdown(resp.content[0].text))
    results: list[DraftAnswer] = []
    for q, ex in zip(questions, data["exchanges"]):
        cb_data = ex.get("callback")
        cb = CallbackAnnotation(phrase=str(cb_data["phrase"]), references_exchange=int(cb_data["references_exchange"])) if cb_data else None
        results.append(DraftAnswer(question=q, response_text=str(ex["answer"]), callback=cb))
    return results


async def generate_answers(cfg: SpeakerConfig, drafts: list[DraftQuestion]) -> list[DraftAnswer]:
    """Generate answers for all draft questions. One LLM call per moment + one for memory."""
    answers: list[DraftAnswer] = []

    by_moment: dict[float, list[DraftQuestion]] = {}
    for d in drafts:
        if d.is_memory_demo:
            continue
        assert d.moment_timestamp is not None
        by_moment.setdefault(d.moment_timestamp, []).append(d)

    scene_by_ts = {m.timestamp: m.scene_context for m in cfg.moments}
    for ts in sorted(by_moment.keys()):
        moment_qs = sorted(by_moment[ts], key=lambda q: q.index_in_moment)
        moment_answers = await _answer_moment(cfg, scene_by_ts[ts], moment_qs)
        answers.extend(moment_answers)

    mem_qs = sorted([d for d in drafts if d.is_memory_demo], key=lambda q: q.index_in_moment)
    if mem_qs:
        answers.extend(await _answer_memory_demo(cfg, mem_qs))

    logger.info("Generated answers", extra={"speaker_id": cfg.speaker_id, "count": len(answers), "with_callbacks": sum(1 for a in answers if a.callback)})
    return answers
