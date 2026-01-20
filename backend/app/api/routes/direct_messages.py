"""Direct messaging REST API routes for friends."""
from datetime import datetime
from typing import List, Optional

from app.core.security import get_current_user
from app.models.direct_message import (
    ConversationSummary,
    DirectMessage,
    DirectMessageCreate,
    DirectMessageResponse,
)
from app.models.user import User
from app.services.chat_translation_service import chat_translation_service
from app.services.friendship_service import FriendshipService
from beanie.operators import And, Or
from fastapi import APIRouter, Depends, HTTPException, Query

router = APIRouter(prefix="/dm", tags=["direct-messages"])


def _build_message_response(
    message: DirectMessage, viewer_id: str, include_translation: bool = True
) -> DirectMessageResponse:
    """Build a DirectMessageResponse from a DirectMessage document."""
    # Determine display message based on viewer
    if (
        include_translation
        and message.has_translation
        and message.receiver_id == viewer_id
    ):
        display_message = message.translated_text or message.message
        is_translated = (
            message.translated_text is not None
            and message.translated_text != message.message
        )
    else:
        display_message = message.message
        is_translated = False

    return DirectMessageResponse(
        id=str(message.id),
        sender_id=message.sender_id,
        sender_name=message.sender_name,
        sender_avatar=message.sender_avatar,
        receiver_id=message.receiver_id,
        receiver_name=message.receiver_name,
        receiver_avatar=message.receiver_avatar,
        message=message.message,
        display_message=display_message,
        message_type=message.message_type,
        source_language=message.source_language,
        is_translated=is_translated,
        translation_available=message.has_translation,
        read=message.read,
        read_at=message.read_at,
        reactions=message.reactions,
        timestamp=message.timestamp,
    )


@router.post("/{friend_id}", response_model=DirectMessageResponse)
async def send_direct_message(
    friend_id: str, request: DirectMessageCreate, user: User = Depends(get_current_user)
):
    """Send a direct message to a friend."""
    user_id = str(user.id)

    # Verify friendship
    if not await FriendshipService.are_friends(user_id, friend_id):
        raise HTTPException(status_code=403, detail="You can only message friends")

    # Get friend info
    friend = await User.get(friend_id)
    if not friend:
        raise HTTPException(status_code=404, detail="Friend not found")

    # Detect language
    detection = await chat_translation_service.detect_language(request.message)
    source_lang = detection.detected_language

    # Check if receiver needs translation
    (
        should_translate,
        target_lang,
    ) = await chat_translation_service.should_translate_for_user(friend_id)

    translated_text = None
    has_translation = False

    if should_translate and source_lang != target_lang:
        result = await chat_translation_service.translate_message(
            request.message, source_lang, target_lang
        )
        if result.translated_text != request.message:
            translated_text = result.translated_text
            has_translation = True

    # Create message
    message = DirectMessage(
        sender_id=user_id,
        sender_name=user.name,
        sender_avatar=user.avatar,
        receiver_id=friend_id,
        receiver_name=friend.name,
        receiver_avatar=friend.avatar,
        message=request.message,
        message_type=request.message_type,
        source_language=source_lang,
        translated_text=translated_text,
        has_translation=has_translation,
    )

    await message.insert()

    return _build_message_response(message, user_id)


@router.get("/{friend_id}", response_model=List[DirectMessageResponse])
async def get_conversation(
    friend_id: str,
    limit: int = Query(default=50, le=200),
    before: Optional[datetime] = None,
    user: User = Depends(get_current_user),
):
    """Get conversation history with a friend."""
    user_id = str(user.id)

    # Verify friendship
    if not await FriendshipService.are_friends(user_id, friend_id):
        raise HTTPException(
            status_code=403, detail="You can only view conversations with friends"
        )

    # Build query for messages between these two users
    query = DirectMessage.find(
        Or(
            And(
                DirectMessage.sender_id == user_id,
                DirectMessage.receiver_id == friend_id,
            ),
            And(
                DirectMessage.sender_id == friend_id,
                DirectMessage.receiver_id == user_id,
            ),
        )
    )

    if before:
        query = query.find(DirectMessage.timestamp < before)

    messages = await query.sort(-DirectMessage.timestamp).limit(limit).to_list()

    # Return in chronological order
    messages.reverse()

    return [_build_message_response(m, user_id) for m in messages]


@router.get("/conversations", response_model=List[ConversationSummary])
async def list_conversations(user: User = Depends(get_current_user)):
    """List all DM conversations with most recent message."""
    user_id = str(user.id)

    # Get all friends
    friends = await FriendshipService.get_friends(user_id)

    conversations = []

    for friend in friends:
        friend_id = friend["user_id"]

        # Get most recent message
        last_message = (
            await DirectMessage.find(
                Or(
                    And(
                        DirectMessage.sender_id == user_id,
                        DirectMessage.receiver_id == friend_id,
                    ),
                    And(
                        DirectMessage.sender_id == friend_id,
                        DirectMessage.receiver_id == user_id,
                    ),
                )
            )
            .sort(-DirectMessage.timestamp)
            .first_or_none()
        )

        if not last_message:
            continue

        # Count unread messages
        unread_count = await DirectMessage.find(
            And(
                DirectMessage.sender_id == friend_id,
                DirectMessage.receiver_id == user_id,
                DirectMessage.read == False,
            )
        ).count()

        conversations.append(
            ConversationSummary(
                friend_id=friend_id,
                friend_name=friend["name"],
                friend_avatar=friend.get("avatar"),
                last_message=last_message.message[:100],
                last_message_at=last_message.timestamp,
                unread_count=unread_count,
            )
        )

    # Sort by most recent message
    conversations.sort(key=lambda c: c.last_message_at, reverse=True)

    return conversations


@router.patch("/{message_id}/read")
async def mark_as_read(message_id: str, user: User = Depends(get_current_user)):
    """Mark a message as read."""
    user_id = str(user.id)

    message = await DirectMessage.get(message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Only receiver can mark as read
    if message.receiver_id != user_id:
        raise HTTPException(
            status_code=403, detail="Can only mark received messages as read"
        )

    if not message.read:
        message.read = True
        message.read_at = datetime.utcnow()
        await message.save()

    return {"success": True}


@router.patch("/read-all/{friend_id}")
async def mark_all_as_read(friend_id: str, user: User = Depends(get_current_user)):
    """Mark all messages from a friend as read."""
    user_id = str(user.id)

    # Verify friendship
    if not await FriendshipService.are_friends(user_id, friend_id):
        raise HTTPException(
            status_code=403, detail="You can only manage messages from friends"
        )

    # Update all unread messages from this friend
    result = await DirectMessage.find(
        And(
            DirectMessage.sender_id == friend_id,
            DirectMessage.receiver_id == user_id,
            DirectMessage.read == False,
        )
    ).update_many({"$set": {"read": True, "read_at": datetime.utcnow()}})

    return {"success": True, "updated_count": result.modified_count if result else 0}


@router.post("/{message_id}/translate")
async def translate_message_on_demand(
    message_id: str, user: User = Depends(get_current_user)
):
    """Manually translate a message (for users with auto-translate off)."""
    user_id = str(user.id)

    message = await DirectMessage.get(message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Verify user is part of this conversation
    if message.sender_id != user_id and message.receiver_id != user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to view this message"
        )

    # Get user's preferred language
    target_lang = user.preferred_language or "he"

    result = await chat_translation_service.translate_message(
        message.message, message.source_language, target_lang
    )

    return {
        "success": True,
        "original": message.message,
        "translated": result.translated_text,
        "source_language": message.source_language,
        "target_language": target_lang,
        "is_cached": result.is_cached,
    }


@router.post("/{message_id}/react")
async def add_reaction(
    message_id: str, emoji: str = Query(...), user: User = Depends(get_current_user)
):
    """Add a reaction to a message."""
    user_id = str(user.id)

    message = await DirectMessage.get(message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Verify user is part of this conversation
    if message.sender_id != user_id and message.receiver_id != user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to react to this message"
        )

    # Add reaction
    if emoji not in message.reactions:
        message.reactions[emoji] = []

    if user_id not in message.reactions[emoji]:
        message.reactions[emoji].append(user_id)
        await message.save()

    return {"success": True, "reactions": message.reactions}


@router.delete("/{message_id}/react")
async def remove_reaction(
    message_id: str, emoji: str = Query(...), user: User = Depends(get_current_user)
):
    """Remove a reaction from a message."""
    user_id = str(user.id)

    message = await DirectMessage.get(message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Verify user is part of this conversation
    if message.sender_id != user_id and message.receiver_id != user_id:
        raise HTTPException(
            status_code=403, detail="Not authorized to modify reactions on this message"
        )

    # Remove reaction
    if emoji in message.reactions and user_id in message.reactions[emoji]:
        message.reactions[emoji].remove(user_id)
        if not message.reactions[emoji]:
            del message.reactions[emoji]
        await message.save()

    return {"success": True, "reactions": message.reactions}
