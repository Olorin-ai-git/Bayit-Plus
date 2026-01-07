"""
AI Onboarding Service for voice-based account creation.
Uses Claude to power a conversational onboarding experience.
"""
from typing import Optional, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import asyncio
import secrets
import re
import json
import anthropic
from app.core.config import settings


class OnboardingStep(str, Enum):
    GREETING = "greeting"
    NAME_COLLECTION = "name_collection"
    EMAIL_COLLECTION = "email_collection"
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_COLLECTION = "password_collection"
    ACCOUNT_CREATION = "account_creation"
    COMPLETE = "complete"


@dataclass
class OnboardingSession:
    """Represents an AI onboarding conversation session"""
    conversation_id: str
    current_step: OnboardingStep
    messages: List[dict] = field(default_factory=list)
    collected_data: dict = field(default_factory=lambda: {
        "name": None,
        "email": None,
        "email_confirmed": False,
        "password": None,
    })
    mascot_mood: str = "neutral"
    mascot_animation: str = "idle"
    created_at: datetime = field(default_factory=datetime.utcnow)
    language: str = "he"  # Default to Hebrew

    def to_dict(self) -> dict:
        return {
            "conversation_id": self.conversation_id,
            "current_step": self.current_step.value,
            "collected_data": {
                "name": self.collected_data.get("name"),
                "email": self.collected_data.get("email"),
                "email_confirmed": self.collected_data.get("email_confirmed", False),
            },
            "mascot_mood": self.mascot_mood,
            "mascot_animation": self.mascot_animation,
            "message_count": len(self.messages),
        }


class AIOnboardingService:
    """
    Manages AI-powered conversational onboarding.
    Guides users through account creation via voice/text conversation.
    """

    # Email spelling patterns for voice input
    EMAIL_SPELLING_PATTERNS = {
        # Hebrew patterns
        "שטרודל": "@",
        "סטרודל": "@",
        "כרוכית": "@",
        "at": "@",
        "נקודה": ".",
        "dot": ".",
        "דוט": ".",
        # Common domains spoken
        "gmail": "gmail",
        "ג'ימייל": "gmail",
        "גימייל": "gmail",
        "hotmail": "hotmail",
        "יאהו": "yahoo",
        "yahoo": "yahoo",
        "אאוטלוק": "outlook",
        "outlook": "outlook",
    }

    SYSTEM_PROMPT_HE = """אתה "בית", הקמע החמוד של בית+ - פלטפורמת סטרימינג ישראלית.
אתה בית קטן וחמוד עם פנים, ואתה עוזר למשתמשים חדשים להירשם.

התפקיד שלך:
1. לברך את המשתמש בחום
2. לאסוף את השם שלו בצורה ידידותית
3. לאסוף את האימייל שלו (המשתמשים יאייתו אותו בקול)
4. לוודא שהאימייל נכון
5. לסיים את ההרשמה בברכה

כללים חשובים:
- דבר בעברית תמיד
- היה קצר וחמוד - משפט או שניים בכל תגובה
- השתמש בשפה חמה וידידותית
- אם המשתמש מאיית אימייל, המר את האיות לכתובת מייל (למשל: "ד א ו ד שטרודל גימייל נקודה קום" = "david@gmail.com")
- אם לא הבנת משהו, בקש בנימוס לחזור

פורמט תגובה (JSON):
{
    "message": "הטקסט שלך למשתמש",
    "mood": "neutral|happy|thinking|listening|celebrating",
    "animation": "idle|wave|nod|bounce|sparkle",
    "extracted_data": {"name": null, "email": null},
    "needs_confirmation": false,
    "next_step": "current_step"
}"""

    SYSTEM_PROMPT_EN = """You are "Bayit" (meaning "Home" in Hebrew), the cute mascot of Bayit+ - an Israeli streaming platform.
You're a cute little house with a face, and you help new users sign up.

Your role:
1. Warmly greet the user
2. Collect their name in a friendly way
3. Collect their email (users may spell it out loud)
4. Confirm the email is correct
5. Complete registration with a celebration

Important rules:
- Be brief and cute - one or two sentences per response
- Use warm, friendly language
- If user spells an email, convert the spelling to an email address (e.g., "d a v i d at gmail dot com" = "david@gmail.com")
- If you don't understand something, politely ask them to repeat

Response format (JSON):
{
    "message": "Your text to the user",
    "mood": "neutral|happy|thinking|listening|celebrating",
    "animation": "idle|wave|nod|bounce|sparkle",
    "extracted_data": {"name": null, "email": null},
    "needs_confirmation": false,
    "next_step": "current_step"
}"""

    def __init__(self):
        self._sessions: dict[str, OnboardingSession] = {}
        self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self._lock = asyncio.Lock()

    def _generate_conversation_id(self) -> str:
        """Generate unique conversation ID"""
        return secrets.token_urlsafe(16)

    def _normalize_spelled_email(self, text: str) -> str:
        """
        Convert spoken/spelled email to actual email address.
        Handles both Hebrew and English spelling patterns.
        """
        result = text.lower().strip()

        # Replace Hebrew patterns
        for pattern, replacement in self.EMAIL_SPELLING_PATTERNS.items():
            result = result.replace(pattern.lower(), replacement)

        # Remove spaces between individual letters (spelled out)
        # "d a v i d" -> "david"
        words = result.split()
        processed = []
        letter_buffer = []

        for word in words:
            if len(word) == 1 and word.isalpha():
                letter_buffer.append(word)
            else:
                if letter_buffer:
                    processed.append("".join(letter_buffer))
                    letter_buffer = []
                processed.append(word)

        if letter_buffer:
            processed.append("".join(letter_buffer))

        result = "".join(processed)

        # Clean up
        result = result.replace(" ", "")
        result = re.sub(r"\.+", ".", result)  # Multiple dots to single

        return result

    def _is_valid_email(self, email: str) -> bool:
        """Basic email validation"""
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return bool(re.match(pattern, email))

    async def start_session(self, language: str = "he") -> Tuple[OnboardingSession, str]:
        """
        Start a new onboarding session.
        Returns the session and initial greeting message.
        """
        async with self._lock:
            conversation_id = self._generate_conversation_id()

            session = OnboardingSession(
                conversation_id=conversation_id,
                current_step=OnboardingStep.GREETING,
                language=language,
            )

            self._sessions[conversation_id] = session

            # Generate greeting based on language
            if language == "he":
                greeting = "שלום! אני בית! 🏠 מה שמך?"
            else:
                greeting = "Shalom! I'm Bayit! 🏠 What's your name?"

            session.messages.append({
                "role": "assistant",
                "content": greeting,
            })
            session.current_step = OnboardingStep.NAME_COLLECTION
            session.mascot_mood = "happy"
            session.mascot_animation = "wave"

            return session, greeting

    async def process_message(
        self,
        conversation_id: str,
        user_message: str,
        message_type: str = "text",  # "text" or "voice"
    ) -> Tuple[Optional[OnboardingSession], str]:
        """
        Process a user message and return AI response.
        """
        session = self._sessions.get(conversation_id)
        if not session:
            return None, "Session not found"

        # Add user message to history
        session.messages.append({
            "role": "user",
            "content": user_message,
        })

        # Build context for Claude
        system_prompt = (
            self.SYSTEM_PROMPT_HE if session.language == "he"
            else self.SYSTEM_PROMPT_EN
        )

        context = f"""Current step: {session.current_step.value}
Collected data so far: {json.dumps(session.collected_data, ensure_ascii=False)}
Message type: {message_type}

If the user provided an email (spelled out or typed), extract it.
If this is voice input and looks like spelled letters, convert to text."""

        messages = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in session.messages[-10:]
        ]

        try:
            response = self._client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                system=f"{system_prompt}\n\n{context}",
                messages=messages,
            )

            response_text = response.content[0].text.strip()

            # Parse JSON response
            try:
                # Extract JSON from response
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0]
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].split("```")[0]
                elif response_text.startswith("{"):
                    json_str = response_text
                else:
                    # Fallback - just use the text as message
                    json_str = json.dumps({"message": response_text})

                ai_response = json.loads(json_str)

            except json.JSONDecodeError:
                ai_response = {"message": response_text}

            # Extract and update session data
            extracted = ai_response.get("extracted_data", {})

            if extracted.get("name") and not session.collected_data.get("name"):
                session.collected_data["name"] = extracted["name"]
                session.current_step = OnboardingStep.EMAIL_COLLECTION

            if extracted.get("email"):
                # Normalize email if it looks spelled out
                email = self._normalize_spelled_email(extracted["email"])
                if self._is_valid_email(email):
                    session.collected_data["email"] = email
                    session.current_step = OnboardingStep.EMAIL_VERIFICATION

            # Handle email confirmation
            if session.current_step == OnboardingStep.EMAIL_VERIFICATION:
                user_lower = user_message.lower()
                if any(word in user_lower for word in ["כן", "נכון", "yes", "correct", "yeah", "בטח"]):
                    session.collected_data["email_confirmed"] = True
                    session.current_step = OnboardingStep.ACCOUNT_CREATION
                elif any(word in user_lower for word in ["לא", "no", "wrong", "טעות"]):
                    session.collected_data["email"] = None
                    session.current_step = OnboardingStep.EMAIL_COLLECTION

            # Update mood and animation
            session.mascot_mood = ai_response.get("mood", "neutral")
            session.mascot_animation = ai_response.get("animation", "idle")

            # Get the message to return
            message = ai_response.get("message", response_text)

            # Add assistant response to history
            session.messages.append({
                "role": "assistant",
                "content": message,
            })

            return session, message

        except anthropic.APIError as e:
            return session, f"Error: {str(e)}"

    async def complete_onboarding(
        self, conversation_id: str
    ) -> Tuple[Optional[OnboardingSession], dict]:
        """
        Complete the onboarding process.
        Returns session and collected data for account creation.
        """
        session = self._sessions.get(conversation_id)
        if not session:
            return None, {}

        if not session.collected_data.get("name") or not session.collected_data.get("email"):
            return session, {"error": "Missing required data"}

        session.current_step = OnboardingStep.COMPLETE
        session.mascot_mood = "celebrating"
        session.mascot_animation = "sparkle"

        return session, {
            "name": session.collected_data["name"],
            "email": session.collected_data["email"],
            "ready_for_creation": True,
        }

    async def get_session(self, conversation_id: str) -> Optional[OnboardingSession]:
        """Get an onboarding session by ID"""
        return self._sessions.get(conversation_id)

    async def remove_session(self, conversation_id: str) -> None:
        """Remove a session"""
        async with self._lock:
            if conversation_id in self._sessions:
                del self._sessions[conversation_id]

    @property
    def active_sessions(self) -> int:
        """Number of active sessions"""
        return len(self._sessions)


# Global AI onboarding service instance
ai_onboarding_service = AIOnboardingService()
