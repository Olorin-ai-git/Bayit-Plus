"""SCORM content expander — Claude Q&A generation per character."""

import json
from typing import List, Optional, Tuple

from pydantic import BaseModel

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.vod_interaction import ContentCharacter

logger = get_logger(__name__)


class ScormQAPair(BaseModel):
    """A single Q&A pair for SCORM export."""

    question: str
    response_text: str
    topic: str = "background"
    difficulty: str = "basic"


class ChainCallback(BaseModel):
    """Memory callback for follow-up chains."""

    phrase: str
    references_exchange: int


class ChainExchange(BaseModel):
    """Single exchange within a follow-up chain."""

    question: str
    response_text: str


class ScormFollowUpChain(BaseModel):
    """A follow-up conversation chain with memory callbacks."""

    exchanges: List[ChainExchange]
    callback: Optional[ChainCallback] = None


_EXPANSION_PROMPT = """Character: {name}
Description: {description}
Context: {movie_context}
Content title: {content_title}
Existing questions: {existing_questions}

Generate {num_pairs} Q&A pairs across topics (background, expertise, opinion, follow-up) and difficulties (basic, intermediate, advanced).

Also generate {num_chains} follow-up chains of {chain_length} exchanges each. Each chain should show conversational continuity — the character references something from an earlier exchange via a callback phrase.

Return ONLY valid JSON with this structure:
{{
  "qa_pairs": [
    {{"question": "...", "response_text": "...", "topic": "...", "difficulty": "..."}}
  ],
  "follow_up_chains": [
    {{
      "exchanges": [{{"question": "...", "response_text": "..."}}],
      "callback": {{"phrase": "...", "references_exchange": 0}}
    }}
  ]
}}

The character should respond in first person, in character, with authentic personality. Responses should be 2-4 sentences."""


async def expand_character_qa(
    character: ContentCharacter,
    content_title: str,
    num_pairs: int,
    num_chains: int,
    chain_length: int,
) -> Tuple[List[ScormQAPair], List[ScormFollowUpChain]]:
    """
    Generate expanded Q&A and follow-up chains for a character.

    Returns (qa_pairs, follow_up_chains). Returns empty lists on failure.
    """
    existing = ", ".join(character.suggested_questions) if character.suggested_questions else "none"
    prompt = _EXPANSION_PROMPT.format(
        name=character.name,
        description=character.description or "",
        movie_context=character.movie_context or "",
        content_title=content_title,
        existing_questions=existing,
        num_pairs=num_pairs,
        num_chains=num_chains,
        chain_length=chain_length,
    )

    try:
        client = get_anthropic_client()
        response = await client.messages.create(
            model=settings.MOVIE_INTERACTION_AI_MODEL,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        data = json.loads(text)
    except json.JSONDecodeError:
        logger.error(
            "Claude returned invalid JSON for SCORM Q&A expansion",
            extra={"character": character.name, "title": content_title},
        )
        return [], []
    except Exception:
        logger.exception(
            "SCORM Q&A expansion failed",
            extra={"character": character.name, "title": content_title},
        )
        return [], []

    qa_pairs = [
        ScormQAPair(**item)
        for item in data.get("qa_pairs", [])
    ]
    chains = [
        ScormFollowUpChain(
            exchanges=[ChainExchange(**ex) for ex in chain.get("exchanges", [])],
            callback=ChainCallback(**chain["callback"]) if chain.get("callback") else None,
        )
        for chain in data.get("follow_up_chains", [])
    ]

    logger.info(
        "SCORM Q&A expansion complete",
        extra={
            "character": character.name,
            "qa_pairs": len(qa_pairs),
            "chains": len(chains),
        },
    )
    return qa_pairs, chains
