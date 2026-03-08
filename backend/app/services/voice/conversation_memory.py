"""
Conversation Memory Module
Secure in-memory conversation history storage with HMAC-based IDs and TTL expiry
"""

import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.voice.models import TurnContext

logger = get_logger(__name__)


class ConversationMemory:
    """
    In-memory conversation history storage with security features.
    - HMAC-based secure conversation IDs
    - User ID validation for access control
    - TTL-based expiry enforcement
    """

    def __init__(self):
        self._conversations: Dict[str, List[Dict]] = {}
        self._user_mappings: Dict[str, str] = {}  # conversation_id -> user_id
        self._expiry: Dict[str, datetime] = {}  # conversation_id -> expiry_time
        self._turns: Dict[str, List[Dict]] = {}  # conversation_id -> turn dicts

    def _generate_secure_id(self, user_id: str, conversation_id: str) -> str:
        """Generate HMAC-based secure conversation ID."""
        if not settings.SECRET_KEY:
            logger.warning("SECRET_KEY not configured, using unsecured conversation IDs")
            return conversation_id

        return hmac.new(
            settings.SECRET_KEY.encode(),
            f"{user_id}:{conversation_id}".encode(),
            hashlib.sha256
        ).hexdigest()[:16]

    def add_message(self, conversation_id: str, message: Dict, user_id: str):
        """
        Add message to conversation history with user validation.

        Args:
            conversation_id: Conversation identifier
            message: Message to add
            user_id: User ID for access control

        Raises:
            PermissionError: If conversation belongs to different user
        """
        # Verify ownership
        if conversation_id in self._user_mappings:
            if self._user_mappings[conversation_id] != user_id:
                logger.error(
                    "Conversation ID access denied",
                    extra={"conversation_id": conversation_id, "user_id": user_id}
                )
                raise PermissionError("Access denied to conversation")
        else:
            self._user_mappings[conversation_id] = user_id

        # Initialize conversation if needed
        if conversation_id not in self._conversations:
            self._conversations[conversation_id] = []

        self._conversations[conversation_id].append(message)

        # Set expiry
        self._expiry[conversation_id] = datetime.utcnow() + timedelta(
            minutes=settings.WIZARD_CHAT_MEMORY_TTL_MINUTES
        )

        # Keep only last N messages
        max_history = settings.WIZARD_CHAT_MAX_HISTORY
        if len(self._conversations[conversation_id]) > max_history:
            self._conversations[conversation_id] = self._conversations[conversation_id][-max_history:]

    def get_history(self, conversation_id: str, user_id: str) -> List[Dict]:
        """
        Get conversation history with user validation and expiry check.

        Args:
            conversation_id: Conversation identifier
            user_id: User ID for access control

        Returns:
            List of conversation messages

        Raises:
            PermissionError: If conversation belongs to different user
        """
        # Check expiry
        if conversation_id in self._expiry:
            if datetime.utcnow() > self._expiry[conversation_id]:
                logger.info("Conversation expired", extra={"conversation_id": conversation_id})
                self.clear(conversation_id)
                return []

        # Verify ownership
        if conversation_id in self._user_mappings:
            if self._user_mappings[conversation_id] != user_id:
                logger.error(
                    "Conversation ID access denied",
                    extra={"conversation_id": conversation_id, "user_id": user_id}
                )
                raise PermissionError("Access denied to conversation")

        return self._conversations.get(conversation_id, [])

    def add_turn(self, conversation_id: str, turn: TurnContext, user_id: str):
        """
        Add a turn to conversation turn history with user validation.

        Args:
            conversation_id: Conversation identifier
            turn: TurnContext to store
            user_id: User ID for access control

        Raises:
            PermissionError: If conversation belongs to different user
        """
        if conversation_id in self._user_mappings:
            if self._user_mappings[conversation_id] != user_id:
                logger.error(
                    "Conversation ID access denied",
                    extra={"conversation_id": conversation_id, "user_id": user_id}
                )
                raise PermissionError("Access denied to conversation")
        else:
            self._user_mappings[conversation_id] = user_id

        if conversation_id not in self._turns:
            self._turns[conversation_id] = []

        self._turns[conversation_id].append(turn.model_dump())

        self._expiry[conversation_id] = datetime.utcnow() + timedelta(
            minutes=settings.WIZARD_CHAT_MEMORY_TTL_MINUTES
        )

        max_turns = 5
        if len(self._turns[conversation_id]) > max_turns:
            self._turns[conversation_id] = self._turns[conversation_id][-max_turns:]

    def get_turns(self, conversation_id: str, user_id: str) -> List[TurnContext]:
        """
        Get conversation turns with user validation and expiry check.

        Args:
            conversation_id: Conversation identifier
            user_id: User ID for access control

        Returns:
            List of TurnContext objects

        Raises:
            PermissionError: If conversation belongs to different user
        """
        if conversation_id in self._expiry:
            if datetime.utcnow() > self._expiry[conversation_id]:
                logger.info("Conversation expired", extra={"conversation_id": conversation_id})
                self.clear(conversation_id)
                return []

        if conversation_id in self._user_mappings:
            if self._user_mappings[conversation_id] != user_id:
                logger.error(
                    "Conversation ID access denied",
                    extra={"conversation_id": conversation_id, "user_id": user_id}
                )
                raise PermissionError("Access denied to conversation")

        return [
            TurnContext(**turn_data)
            for turn_data in self._turns.get(conversation_id, [])
        ]

    def clear(self, conversation_id: str):
        """Clear conversation history, turns, and metadata."""
        if conversation_id in self._conversations:
            del self._conversations[conversation_id]
        if conversation_id in self._turns:
            del self._turns[conversation_id]
        if conversation_id in self._user_mappings:
            del self._user_mappings[conversation_id]
        if conversation_id in self._expiry:
            del self._expiry[conversation_id]


# Global conversation memory
conversation_memory = ConversationMemory()
