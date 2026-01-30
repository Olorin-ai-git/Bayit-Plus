"""
Chat Messaging Endpoints - Conversation and message handling

Endpoints for chat messaging and conversation management.
"""

import json
from datetime import datetime, timezone
from typing import Optional

import anthropic
from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.watchlist import Conversation
from app.services.chat_search_tool import CHAT_TOOLS, execute_chat_tool

from .helpers import (build_media_context, extract_json_from_response,
                      strip_markdown)
from .models import ChatRequest, ChatResponse
from .prompts import get_system_prompt
from .services import (align_message_with_action, extract_action_from_response,
                       get_recommendations_from_response)

router = APIRouter()
_anthropic_client: Optional[anthropic.Anthropic] = None


def get_anthropic_client() -> anthropic.Anthropic:
    """Get or create Anthropic client instance."""
    global _anthropic_client
    if _anthropic_client is None:
        _anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _anthropic_client


async def _execute_tools(
    tool_use_blocks: list, system_prompt: str, tool_use_messages: list
) -> list[dict]:
    """Execute tool calls and return results."""
    tool_results = []
    for tool_use in tool_use_blocks:
        print(f"[CHAT] Tool called: {tool_use.name} with input: {tool_use.input}")
        try:
            result = await execute_chat_tool(tool_use.name, tool_use.input)
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": tool_use.id,
                    "content": json.dumps(result, ensure_ascii=False),
                }
            )
            print(f"[CHAT] Tool result: {len(result.get('results', []))} items found")
        except Exception as e:
            print(f"[CHAT] Tool error: {e}")
            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": tool_use.id,
                    "content": json.dumps({"error": str(e)}),
                    "is_error": True,
                }
            )
    return tool_results


async def _run_tool_loop(
    client: anthropic.Anthropic,
    response: anthropic.types.Message,
    messages: list[dict],
    system_prompt: str,
    max_iterations: int = 3,
) -> anthropic.types.Message:
    """Execute tool use loop until completion."""
    tool_msgs = list(messages)
    while response.stop_reason == "tool_use" and max_iterations > 0:
        max_iterations -= 1
        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
        tool_results = await _execute_tools(tool_use_blocks, system_prompt, tool_msgs)
        tool_msgs.append(
            {
                "role": "assistant",
                "content": [
                    {"type": b.type, **b.model_dump()} for b in response.content
                ],
            }
        )
        tool_msgs.append({"role": "user", "content": tool_results})
        response = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=tool_msgs,
            tools=CHAT_TOOLS,
        )
    return response


async def _get_or_create_conversation(cid: Optional[str], uid: str) -> Conversation:
    """Get existing conversation or create new one."""
    conv = None
    if cid:
        conv = await Conversation.get(cid)
        if conv and conv.user_id != uid:
            conv = None
    if not conv:
        conv = Conversation(user_id=uid, messages=[], context={})
        await conv.insert()
    return conv


@router.post("/", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: User = Depends(get_current_active_user),
) -> ChatResponse:
    """Send a message to the AI assistant."""
    lang = (request.language or "he").lower()
    print(f"[CHAT] Received message: '{request.message}', language: {lang}")

    conv = await _get_or_create_conversation(
        request.conversation_id, str(current_user.id)
    )
    conv.messages.append(
        {
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
    messages = [
        {"role": m["role"], "content": m["content"]} for m in conv.messages[-10:]
    ]

    try:
        media_ctx = await build_media_context()
        sys_prompt = get_system_prompt(lang, media_ctx)
        client = get_anthropic_client()
        resp = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            system=sys_prompt,
            messages=messages,
            tools=CHAT_TOOLS,
        )
        resp = await _run_tool_loop(client, resp, messages, sys_prompt)
        raw = next((b.text for b in resp.content if b.type == "text"), "")
        asst_msg, _ = extract_json_from_response(raw)
        conv.messages.append(
            {
                "role": "assistant",
                "content": asst_msg,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )
        conv.updated_at = datetime.now(timezone.utc)
        await conv.save()
        recs = await get_recommendations_from_response(
            asst_msg, request.message, media_ctx
        )
        action = await extract_action_from_response(asst_msg, request.message, lang)
        final_msg = await align_message_with_action(
            asst_msg, action, request.message, lang
        )
        return ChatResponse(
            message=final_msg,
            conversation_id=str(conv.id),
            recommendations=recs,
            language=lang,
            spoken_response=strip_markdown(final_msg),
            action=action,
            content_ids=None,
            visual_action=None,
            confidence=action.get("confidence", 0.8) if action else 0.8,
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str, current_user: User = Depends(get_current_active_user)
) -> dict:
    """Get conversation history."""
    conv = await Conversation.get(conversation_id)
    if not conv or conv.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {
        "id": str(conv.id),
        "messages": [
            {
                "role": m["role"],
                "content": m["content"],
                "timestamp": m.get("timestamp"),
            }
            for m in conv.messages
        ],
        "created_at": conv.created_at.isoformat(),
    }


@router.delete("/{conversation_id}")
async def clear_conversation(
    conversation_id: str, current_user: User = Depends(get_current_active_user)
) -> dict:
    """Clear conversation history."""
    conv = await Conversation.get(conversation_id)
    if not conv or conv.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.messages = []
    conv.updated_at = datetime.now(timezone.utc)
    await conv.save()
    return {"message": "Conversation cleared"}
