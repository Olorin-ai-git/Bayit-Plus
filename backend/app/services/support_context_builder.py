"""
Support Context Builder
Builds context for LLM support chat by injecting relevant documentation,
FAQ entries, and user context to provide intelligent support responses.
"""

import json
from typing import Optional, List
from pathlib import Path

from app.core.config import settings
from app.models.support import FAQEntry, SupportConversation
from app.models.user import User


class SupportContextBuilder:
    """
    Builds context for support LLM interactions.
    Injects relevant documentation, FAQ entries, and user context.
    """

    def __init__(self):
        self.docs_base_path = Path(__file__).parent.parent.parent.parent / 'shared' / 'data' / 'support' / 'docs'
        self._doc_cache: dict = {}
        self._faq_cache: dict = {}

    async def build_context(
        self,
        query: str,
        language: str = 'en',
        user: Optional[User] = None,
        app_context: Optional[dict] = None,
        max_docs: int = 3,
    ) -> dict:
        """
        Build comprehensive context for support chat.

        Args:
            query: User's question or request
            language: Language code (en, he, es)
            user: Current user (for subscription tier, history)
            app_context: Current app state (screen, recent actions)
            max_docs: Maximum documentation excerpts to include

        Returns:
            Dictionary with context fields for LLM prompt
        """
        context = {
            'docs': [],
            'faq': [],
            'user_info': {},
            'app_state': {},
            'instructions': '',
        }

        # Find relevant documentation
        relevant_docs = await self._find_relevant_docs(query, language, max_docs)
        context['docs'] = relevant_docs

        # Find relevant FAQ entries
        relevant_faq = await self._find_relevant_faq(query, language)
        context['faq'] = relevant_faq

        # Add user context
        if user:
            context['user_info'] = self._build_user_context(user)

        # Add app state context
        if app_context:
            context['app_state'] = self._build_app_context(app_context)

        # Build system instructions
        context['instructions'] = self._build_instructions(language, context)

        return context

    async def _find_relevant_docs(
        self,
        query: str,
        language: str,
        max_docs: int,
    ) -> List[dict]:
        """
        Find documentation excerpts relevant to the query.
        Uses simple keyword matching for now - can be enhanced with embeddings.
        """
        relevant = []

        # Get doc manifest
        manifest = await self._load_doc_manifest(language)
        if not manifest:
            return relevant

        query_lower = query.lower()
        query_words = set(query_lower.split())

        # Score each document by keyword overlap
        scored_docs = []
        for doc in manifest.get('articles', []):
            doc_words = set(doc.get('keywords', []))
            doc_words.update(doc.get('title', '').lower().split())

            overlap = len(query_words & doc_words)
            if overlap > 0:
                scored_docs.append((overlap, doc))

        # Sort by score and take top N
        scored_docs.sort(key=lambda x: x[0], reverse=True)

        for score, doc in scored_docs[:max_docs]:
            content = await self._load_doc_content(doc['path'], language)
            if content:
                relevant.append({
                    'title': doc.get('title', ''),
                    'path': doc['path'],
                    'excerpt': content[:500] + '...' if len(content) > 500 else content,
                    'relevance_score': score,
                })

        return relevant

    async def _find_relevant_faq(
        self,
        query: str,
        language: str,
        max_items: int = 3,
    ) -> List[dict]:
        """Find FAQ entries relevant to the query."""
        relevant = []

        try:
            # Get active FAQ entries
            faq_entries = await FAQEntry.find(
                FAQEntry.is_active == True
            ).to_list()

            query_lower = query.lower()

            for entry in faq_entries:
                # Get translation for language
                trans = entry.translations.get(language, {})
                question = trans.get('question', '')
                answer = trans.get('answer', '')

                # Simple relevance check
                if query_lower in question.lower() or any(
                    word in question.lower() for word in query_lower.split()
                ):
                    relevant.append({
                        'question': question,
                        'answer': answer,
                        'category': entry.category,
                    })

                if len(relevant) >= max_items:
                    break

        except Exception as e:
            print(f'[SupportContext] Error finding FAQ: {e}')

        return relevant

    def _build_user_context(self, user: User) -> dict:
        """Build user context for personalized support."""
        return {
            'name': user.name,
            'subscription_tier': getattr(user, 'subscription', {}).get('plan', 'free'),
            'is_premium': getattr(user, 'subscription', {}).get('plan') in ['premium', 'family'],
            'language': getattr(user, 'preferred_language', 'en'),
            'member_since': user.created_at.strftime('%Y-%m-%d') if user.created_at else None,
        }

    def _build_app_context(self, app_context: dict) -> dict:
        """Build app state context."""
        return {
            'current_screen': app_context.get('currentScreen', 'unknown'),
            'recent_actions': app_context.get('recentActions', [])[-5:],
            'playing_content': app_context.get('playingContent'),
            'last_error': app_context.get('lastError'),
        }

    def _build_instructions(self, language: str, context: dict) -> str:
        """Build system instructions based on context."""
        if language == 'he':
            base = """אתה עוזר תמיכה של Bayit+. עזור למשתמשים בשאלות על השירות.
תענה בעברית, בקצרה וברורות.
אם אתה לא בטוח בתשובה, הצע ליצור פניה לתמיכה."""
        elif language == 'es':
            base = """Eres un asistente de soporte de Bayit+. Ayuda a los usuarios con preguntas sobre el servicio.
Responde en español, de forma breve y clara.
Si no estás seguro de la respuesta, sugiere crear un ticket de soporte."""
        else:
            base = """You are a Bayit+ support assistant. Help users with questions about the service.
Respond briefly and clearly in English.
If you're unsure of the answer, suggest creating a support ticket."""

        # Add context about available info
        if context.get('docs'):
            if language == 'he':
                base += '\n\nיש לך מידע רלוונטי מהתיעוד שלנו שתוכל להשתמש בו לענות.'
            elif language == 'es':
                base += '\n\nTienes información relevante de nuestra documentación que puedes usar para responder.'
            else:
                base += '\n\nYou have relevant information from our documentation that you can use to answer.'

        if context.get('faq'):
            if language == 'he':
                base += '\n\nיש שאלות נפוצות רלוונטיות שיכולות לעזור.'
            elif language == 'es':
                base += '\n\nHay preguntas frecuentes relevantes que pueden ayudar.'
            else:
                base += '\n\nThere are relevant FAQ entries that may help.'

        return base

    async def _load_doc_manifest(self, language: str) -> Optional[dict]:
        """Load documentation manifest for a language."""
        manifest_path = self.docs_base_path / 'manifest.json'

        try:
            if manifest_path.exists():
                with open(manifest_path, 'r', encoding='utf-8') as f:
                    manifest = json.load(f)
                    # Filter by language
                    articles = [
                        a for a in manifest.get('articles', [])
                        if a.get('language') == language
                    ]
                    return {'articles': articles}
        except Exception as e:
            print(f'[SupportContext] Error loading manifest: {e}')

        return None

    async def _load_doc_content(self, doc_path: str, language: str) -> Optional[str]:
        """Load documentation content from file."""
        full_path = self.docs_base_path / language / doc_path

        try:
            if full_path.exists():
                with open(full_path, 'r', encoding='utf-8') as f:
                    return f.read()
        except Exception as e:
            print(f'[SupportContext] Error loading doc {doc_path}: {e}')

        return None

    def format_context_for_prompt(self, context: dict) -> str:
        """Format context dict as string for LLM prompt injection."""
        parts = []

        # Add documentation excerpts
        if context.get('docs'):
            parts.append('=== RELEVANT DOCUMENTATION ===')
            for doc in context['docs']:
                parts.append(f"**{doc['title']}**")
                parts.append(doc['excerpt'])
                parts.append('')

        # Add FAQ entries
        if context.get('faq'):
            parts.append('=== RELEVANT FAQ ===')
            for faq in context['faq']:
                parts.append(f"Q: {faq['question']}")
                parts.append(f"A: {faq['answer']}")
                parts.append('')

        # Add user info
        if context.get('user_info'):
            user = context['user_info']
            parts.append('=== USER CONTEXT ===')
            parts.append(f"Name: {user.get('name', 'Unknown')}")
            parts.append(f"Plan: {user.get('subscription_tier', 'free')}")
            parts.append('')

        # Add app state
        if context.get('app_state'):
            state = context['app_state']
            parts.append('=== CURRENT STATE ===')
            parts.append(f"Screen: {state.get('current_screen', 'unknown')}")
            if state.get('last_error'):
                parts.append(f"Last Error: {state['last_error']}")
            parts.append('')

        return '\n'.join(parts)


# Singleton instance
support_context_builder = SupportContextBuilder()
