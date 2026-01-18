"""
Support Service
Business logic for support system including ticket management,
voice chat, documentation, and analytics.

Performance-optimized with async streaming for low-latency voice interactions.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple, AsyncIterator
import math
import logging
import anthropic

from beanie import PydanticObjectId

from app.core.config import settings
from app.models.support import (
    SupportTicket,
    SupportConversation,
    SupportAnalytics,
    FAQEntry,
    TicketNote,
    TicketMessage,
)
from app.models.user import User
from app.services.support_context_builder import support_context_builder

logger = logging.getLogger(__name__)


class SupportService:
    """
    Support system business logic.
    Handles tickets, voice chat, FAQ, and analytics.

    Uses async Anthropic client for non-blocking LLM calls with streaming support.
    """

    def __init__(self):
        # Use AsyncAnthropic for non-blocking streaming responses
        self.async_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.max_tokens = int(getattr(settings, 'SUPPORT_CHAT_MAX_TOKENS', 300))
        self.escalation_threshold = float(getattr(settings, 'SUPPORT_ESCALATION_THRESHOLD', 0.5))

    # =========================================================================
    # Voice Support Chat
    # =========================================================================

    async def chat(
        self,
        message: str,
        user: User,
        language: str = 'en',
        conversation_id: Optional[str] = None,
        app_context: Optional[dict] = None,
    ) -> dict:
        """
        Process a voice support chat message.

        Returns dict with:
            - message: Response text
            - conversation_id: Conversation ID
            - spoken_response: TTS-optimized text
            - docs_referenced: List of doc paths used
            - escalation_needed: Whether to suggest creating a ticket
            - confidence: Response confidence score
        """
        # Get or create conversation
        conversation = await self._get_or_create_conversation(
            user, conversation_id, language
        )

        # Build context for this query
        context = await support_context_builder.build_context(
            query=message,
            language=language,
            user=user,
            app_context=app_context,
            max_docs=int(getattr(settings, 'SUPPORT_CONTEXT_MAX_DOCS', 3)),
        )

        # Add user message to conversation
        conversation.messages.append({
            'role': 'user',
            'content': message,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        })

        # Build messages for Claude
        system_prompt = context['instructions']
        context_prompt = support_context_builder.format_context_for_prompt(context)

        if context_prompt:
            system_prompt += f'\n\n{context_prompt}'

        messages = [
            {'role': msg['role'], 'content': msg['content']}
            for msg in conversation.messages[-10:]
        ]

        try:
            # Call Claude using async client (non-blocking)
            response = await self.async_client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=self.max_tokens,
                system=system_prompt,
                messages=messages,
            )

            response_text = response.content[0].text.strip()

            # Determine if escalation is needed
            escalation_needed, escalation_reason = self._check_escalation(
                message, response_text, context
            )

            # Add assistant response to conversation
            conversation.messages.append({
                'role': 'assistant',
                'content': response_text,
                'timestamp': datetime.now(timezone.utc).isoformat(),
            })

            # Update conversation with docs referenced
            doc_paths = [d['path'] for d in context.get('docs', [])]
            conversation.docs_referenced = list(set(
                conversation.docs_referenced + doc_paths
            ))

            if escalation_needed and not conversation.escalated:
                conversation.escalated = True
                conversation.escalation_reason = escalation_reason

            conversation.updated_at = datetime.now(timezone.utc)
            await conversation.save()

            return {
                'message': response_text,
                'conversation_id': str(conversation.id),
                'language': language,
                'spoken_response': self._clean_for_tts(response_text),
                'docs_referenced': doc_paths,
                'escalation_needed': escalation_needed,
                'escalation_reason': escalation_reason,
                'confidence': 0.9 if not escalation_needed else 0.5,
            }

        except anthropic.APIError as e:
            print(f'[Support] Claude API error: {e}')
            raise

    def _check_escalation(
        self,
        query: str,
        response: str,
        context: dict,
    ) -> Tuple[bool, Optional[str]]:
        """Check if the conversation should be escalated to a ticket."""
        # Keywords indicating complex issues
        escalation_keywords = [
            'billing', 'refund', 'cancel', 'payment', 'charge',
            'account', 'locked', 'suspended', 'hacked',
            'not working', 'broken', 'bug', 'error',
        ]

        query_lower = query.lower()

        # Check for billing/account issues
        if any(kw in query_lower for kw in ['billing', 'refund', 'cancel', 'payment']):
            return True, 'billing_issue'

        # Check for account security
        if any(kw in query_lower for kw in ['hacked', 'locked', 'suspended', 'password']):
            return True, 'account_security'

        # Check if no relevant docs were found
        if not context.get('docs') and not context.get('faq'):
            if any(kw in query_lower for kw in escalation_keywords):
                return True, 'no_documentation'

        # Check response confidence indicators
        uncertain_phrases = [
            "i'm not sure", "i don't know", "you may need to contact",
            "לא בטוח", "לא יודע", "צריך ליצור קשר",
            "no estoy seguro", "no sé", "contactar soporte",
        ]
        response_lower = response.lower()
        if any(phrase in response_lower for phrase in uncertain_phrases):
            return True, 'low_confidence'

        return False, None

    def _clean_for_tts(self, text: str) -> str:
        """Clean text for TTS readability."""
        import re

        # Remove markdown
        text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
        text = re.sub(r'\*(.+?)\*', r'\1', text)
        text = re.sub(r'`(.+?)`', r'\1', text)
        text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)

        # Remove URLs
        text = re.sub(r'https?://\S+', '', text)

        return text.strip()

    async def chat_streaming(
        self,
        message: str,
        user: User,
        language: str = 'en',
        conversation_id: Optional[str] = None,
        app_context: Optional[dict] = None,
    ) -> AsyncIterator[dict]:
        """
        Process a voice support chat message with streaming response.

        Yields text chunks as they arrive from Claude for ultra-low latency.
        Final chunk includes metadata (conversation_id, escalation info).

        Yields dict with:
            - type: 'chunk' | 'complete' | 'error'
            - text: Response text chunk (for 'chunk' type)
            - conversation_id: Conversation ID (for 'complete' type)
            - escalation_needed: Whether to suggest creating a ticket
            - confidence: Response confidence score
        """
        # Get or create conversation
        conversation = await self._get_or_create_conversation(
            user, conversation_id, language
        )

        # Build context for this query
        context = await support_context_builder.build_context(
            query=message,
            language=language,
            user=user,
            app_context=app_context,
            max_docs=int(getattr(settings, 'SUPPORT_CONTEXT_MAX_DOCS', 3)),
        )

        # Add user message to conversation
        conversation.messages.append({
            'role': 'user',
            'content': message,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        })

        # Build messages for Claude
        system_prompt = context['instructions']
        context_prompt = support_context_builder.format_context_for_prompt(context)

        if context_prompt:
            system_prompt += f'\n\n{context_prompt}'

        messages = [
            {'role': msg['role'], 'content': msg['content']}
            for msg in conversation.messages[-10:]
        ]

        full_response = ""

        try:
            # Stream Claude response for low latency
            async with self.async_client.messages.stream(
                model=settings.CLAUDE_MODEL,
                max_tokens=self.max_tokens,
                system=system_prompt,
                messages=messages,
            ) as stream:
                async for text_chunk in stream.text_stream:
                    full_response += text_chunk
                    yield {
                        'type': 'chunk',
                        'text': text_chunk,
                    }

            # Get final response text
            response_text = full_response.strip()

            # Determine if escalation is needed
            escalation_needed, escalation_reason = self._check_escalation(
                message, response_text, context
            )

            # Add assistant response to conversation
            conversation.messages.append({
                'role': 'assistant',
                'content': response_text,
                'timestamp': datetime.now(timezone.utc).isoformat(),
            })

            # Update conversation with docs referenced
            doc_paths = [d['path'] for d in context.get('docs', [])]
            conversation.docs_referenced = list(set(
                conversation.docs_referenced + doc_paths
            ))

            if escalation_needed and not conversation.escalated:
                conversation.escalated = True
                conversation.escalation_reason = escalation_reason

            conversation.updated_at = datetime.now(timezone.utc)
            await conversation.save()

            # Yield completion metadata
            yield {
                'type': 'complete',
                'conversation_id': str(conversation.id),
                'language': language,
                'spoken_response': self._clean_for_tts(response_text),
                'docs_referenced': doc_paths,
                'escalation_needed': escalation_needed,
                'escalation_reason': escalation_reason,
                'confidence': 0.9 if not escalation_needed else 0.5,
            }

        except anthropic.APIError as e:
            logger.error(f'[Support] Claude API error during streaming: {e}')
            yield {
                'type': 'error',
                'message': str(e),
            }
            raise

    async def _get_or_create_conversation(
        self,
        user: User,
        conversation_id: Optional[str],
        language: str,
    ) -> SupportConversation:
        """Get existing or create new support conversation."""
        if conversation_id:
            try:
                conversation = await SupportConversation.get(conversation_id)
                if conversation and conversation.user_id == user.id:
                    return conversation
            except Exception:
                pass

        # Create new conversation
        conversation = SupportConversation(
            user_id=user.id,
            language=language,
            messages=[],
        )
        await conversation.insert()
        return conversation

    async def rate_conversation(
        self,
        conversation_id: str,
        user: User,
        rating: int,
        feedback: Optional[str] = None,
    ) -> bool:
        """Rate a support conversation."""
        try:
            conversation = await SupportConversation.get(conversation_id)
            if not conversation or conversation.user_id != user.id:
                return False

            conversation.rating = rating
            conversation.feedback = feedback
            await conversation.save()

            return True
        except Exception as e:
            print(f'[Support] Error rating conversation: {e}')
            return False

    # =========================================================================
    # Ticket Management
    # =========================================================================

    async def create_ticket(
        self,
        user: User,
        subject: str,
        message: str,
        category: str = 'general',
        priority: Optional[str] = None,
        language: str = 'en',
        voice_conversation_id: Optional[str] = None,
    ) -> SupportTicket:
        """Create a new support ticket."""
        # Auto-detect priority if not provided
        if not priority:
            priority = self._detect_priority(subject, message)

        ticket = SupportTicket(
            user_id=user.id,
            user_email=user.email,
            user_name=user.name,
            subject=subject,
            message=message,
            category=category,
            priority=priority,
            language=language,
            voice_conversation_id=voice_conversation_id,
        )

        await ticket.insert()
        return ticket

    def _detect_priority(self, subject: str, message: str) -> str:
        """Auto-detect ticket priority based on content."""
        text = f'{subject} {message}'.lower()

        # Urgent indicators
        urgent_words = ['urgent', 'emergency', 'immediately', 'asap', 'critical']
        if any(word in text for word in urgent_words):
            return 'urgent'

        # High priority indicators
        high_words = ['payment', 'billing', 'refund', 'cancel', 'not working', 'broken']
        if any(word in text for word in high_words):
            return 'high'

        # Low priority indicators
        low_words = ['suggestion', 'feature request', 'feedback', 'idea', 'would be nice']
        if any(word in text for word in low_words):
            return 'low'

        return 'medium'

    async def get_ticket(
        self,
        ticket_id: str,
        user: Optional[User] = None,
        is_admin: bool = False,
    ) -> Optional[SupportTicket]:
        """Get a ticket by ID, with permission check."""
        try:
            ticket = await SupportTicket.get(ticket_id)
            if not ticket:
                return None

            # Check permission
            if not is_admin and user and ticket.user_id != user.id:
                return None

            return ticket
        except Exception:
            return None

    async def list_user_tickets(
        self,
        user: User,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
    ) -> Tuple[List[SupportTicket], int]:
        """List tickets for a user."""
        query = SupportTicket.find(SupportTicket.user_id == user.id)

        if status:
            query = query.find(SupportTicket.status == status)

        total = await query.count()
        tickets = await query.sort(-SupportTicket.created_at).skip(
            (page - 1) * page_size
        ).limit(page_size).to_list()

        return tickets, total

    async def list_admin_tickets(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        category: Optional[str] = None,
        assigned_to: Optional[str] = None,
    ) -> Tuple[List[SupportTicket], int, dict]:
        """List tickets for admin with filters and stats."""
        query = SupportTicket.find()

        if status:
            query = query.find(SupportTicket.status == status)
        if priority:
            query = query.find(SupportTicket.priority == priority)
        if category:
            query = query.find(SupportTicket.category == category)
        if assigned_to:
            query = query.find(SupportTicket.assigned_to == assigned_to)

        total = await query.count()

        # Sort by priority (urgent first) then by date
        tickets = await query.sort([
            ('priority', -1),
            ('created_at', -1),
        ]).skip((page - 1) * page_size).limit(page_size).to_list()

        # Get aggregate stats
        stats = await self._get_ticket_stats()

        return tickets, total, stats

    async def _get_ticket_stats(self) -> dict:
        """Get aggregate ticket statistics."""
        stats = {
            'by_status': {},
            'by_priority': {},
            'by_category': {},
        }

        # This is a simple implementation - can be optimized with aggregation
        all_tickets = await SupportTicket.find().to_list()

        for ticket in all_tickets:
            stats['by_status'][ticket.status] = stats['by_status'].get(ticket.status, 0) + 1
            stats['by_priority'][ticket.priority] = stats['by_priority'].get(ticket.priority, 0) + 1
            stats['by_category'][ticket.category] = stats['by_category'].get(ticket.category, 0) + 1

        return stats

    async def update_ticket(
        self,
        ticket_id: str,
        admin: User,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_to: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> Optional[SupportTicket]:
        """Update ticket (admin only)."""
        ticket = await SupportTicket.get(ticket_id)
        if not ticket:
            return None

        if status:
            ticket.status = status
            if status == 'resolved':
                ticket.resolved_at = datetime.now(timezone.utc)
                # Calculate resolution time
                if ticket.created_at:
                    delta = datetime.now(timezone.utc) - ticket.created_at
                    ticket.resolution_time_minutes = int(delta.total_seconds() / 60)
            elif status == 'closed':
                ticket.closed_at = datetime.now(timezone.utc)

        if priority:
            ticket.priority = priority

        if assigned_to is not None:
            ticket.assigned_to = assigned_to
            ticket.assigned_at = datetime.now(timezone.utc) if assigned_to else None

        if tags is not None:
            ticket.tags = tags

        ticket.updated_at = datetime.now(timezone.utc)
        await ticket.save()

        return ticket

    async def add_ticket_message(
        self,
        ticket_id: str,
        author: User,
        content: str,
        is_support: bool = False,
    ) -> Optional[SupportTicket]:
        """Add a message to a ticket thread."""
        ticket = await SupportTicket.get(ticket_id)
        if not ticket:
            return None

        message = TicketMessage(
            author_id=str(author.id),
            author_name=author.name,
            author_role='support' if is_support else 'user',
            content=content,
        )

        ticket.messages.append(message)
        ticket.updated_at = datetime.now(timezone.utc)

        # Track first response time for support messages
        if is_support and not ticket.first_response_at:
            ticket.first_response_at = datetime.now(timezone.utc)

        await ticket.save()
        return ticket

    async def add_ticket_note(
        self,
        ticket_id: str,
        admin: User,
        content: str,
    ) -> Optional[SupportTicket]:
        """Add an internal note to a ticket (admin only)."""
        ticket = await SupportTicket.get(ticket_id)
        if not ticket:
            return None

        note = TicketNote(
            author_id=str(admin.id),
            author_name=admin.name,
            content=content,
        )

        ticket.notes.append(note)
        ticket.updated_at = datetime.now(timezone.utc)
        await ticket.save()

        return ticket

    # =========================================================================
    # FAQ Management
    # =========================================================================

    async def get_faq_by_category(
        self,
        category: Optional[str] = None,
        language: str = 'en',
    ) -> List[dict]:
        """Get FAQ entries, optionally filtered by category."""
        query = FAQEntry.find(FAQEntry.is_active == True)

        if category:
            query = query.find(FAQEntry.category == category)

        entries = await query.sort(FAQEntry.order).to_list()

        result = []
        for entry in entries:
            trans = entry.translations.get(language, {})
            result.append({
                'id': str(entry.id),
                'question': trans.get('question', entry.question_key),
                'answer': trans.get('answer', entry.answer_key),
                'category': entry.category,
                'views': entry.views,
                'helpful_yes': entry.helpful_yes,
                'helpful_no': entry.helpful_no,
            })

        return result

    async def record_faq_view(self, faq_id: str) -> None:
        """Record a view for an FAQ entry."""
        try:
            entry = await FAQEntry.get(faq_id)
            if entry:
                entry.views += 1
                await entry.save()
        except Exception as e:
            print(f'[Support] Error recording FAQ view: {e}')

    async def record_faq_feedback(
        self,
        faq_id: str,
        helpful: bool,
    ) -> None:
        """Record feedback for an FAQ entry."""
        try:
            entry = await FAQEntry.get(faq_id)
            if entry:
                if helpful:
                    entry.helpful_yes += 1
                else:
                    entry.helpful_no += 1
                await entry.save()
        except Exception as e:
            print(f'[Support] Error recording FAQ feedback: {e}')

    # =========================================================================
    # Analytics
    # =========================================================================

    async def get_analytics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> dict:
        """Get support analytics for a date range."""
        if not end_date:
            end_date = datetime.now(timezone.utc)
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Get tickets in range
        tickets = await SupportTicket.find(
            SupportTicket.created_at >= start_date,
            SupportTicket.created_at <= end_date,
        ).to_list()

        # Get conversations in range
        conversations = await SupportConversation.find(
            SupportConversation.created_at >= start_date,
            SupportConversation.created_at <= end_date,
        ).to_list()

        # Calculate metrics
        tickets_resolved = len([t for t in tickets if t.status == 'resolved'])
        tickets_open = len([t for t in tickets if t.status == 'open'])

        voice_escalations = len([c for c in conversations if c.escalated])
        escalation_rate = voice_escalations / len(conversations) if conversations else 0

        # Response times
        response_times = [
            (t.first_response_at - t.created_at).total_seconds() / 60
            for t in tickets
            if t.first_response_at
        ]
        avg_response = sum(response_times) / len(response_times) if response_times else None

        # Resolution times
        resolution_times = [t.resolution_time_minutes for t in tickets if t.resolution_time_minutes]
        avg_resolution = sum(resolution_times) / len(resolution_times) if resolution_times else None

        # Ratings
        rated_conversations = [c for c in conversations if c.rating]
        avg_rating = sum(c.rating for c in rated_conversations) / len(rated_conversations) if rated_conversations else None

        # Category breakdown
        by_category = {}
        for t in tickets:
            by_category[t.category] = by_category.get(t.category, 0) + 1

        # Priority breakdown
        by_priority = {}
        for t in tickets:
            by_priority[t.priority] = by_priority.get(t.priority, 0) + 1

        return {
            'period_start': start_date,
            'period_end': end_date,
            'tickets_created': len(tickets),
            'tickets_resolved': tickets_resolved,
            'tickets_open': tickets_open,
            'tickets_by_category': by_category,
            'tickets_by_priority': by_priority,
            'voice_conversations': len(conversations),
            'voice_escalations': voice_escalations,
            'escalation_rate': round(escalation_rate, 2),
            'avg_first_response_minutes': round(avg_response, 1) if avg_response else None,
            'avg_resolution_minutes': round(avg_resolution, 1) if avg_resolution else None,
            'avg_rating': round(avg_rating, 2) if avg_rating else None,
            'ratings_count': len(rated_conversations),
            'common_topics': [],  # Can be enhanced with topic extraction
        }


# Singleton instance
support_service = SupportService()
