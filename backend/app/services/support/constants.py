"""
Support Service Constants
Centralized configuration for ticket management and escalation logic.
"""

from typing import List


# Escalation keywords for support chat
ESCALATION_KEYWORDS: List[str] = [
    'billing', 'refund', 'cancel', 'payment', 'charge',
    'account', 'locked', 'suspended', 'hacked',
    'not working', 'broken', 'bug', 'error',
]

# Billing/account keywords that trigger immediate escalation
BILLING_KEYWORDS: List[str] = ['billing', 'refund', 'cancel', 'payment']

# Account security keywords that trigger immediate escalation
SECURITY_KEYWORDS: List[str] = ['hacked', 'locked', 'suspended', 'password']

# Uncertain phrases indicating low confidence responses (multilingual)
UNCERTAIN_PHRASES: List[str] = [
    "i'm not sure", "i don't know", "you may need to contact",
    "i cannot help", "please contact support",
    # Hebrew
    "לא בטוח", "לא יודע", "צריך ליצור קשר",
    # Spanish
    "no estoy seguro", "no sé", "contactar soporte",
]

# Priority detection words
URGENT_PRIORITY_WORDS: List[str] = [
    'urgent', 'emergency', 'immediately', 'asap', 'critical'
]

HIGH_PRIORITY_WORDS: List[str] = [
    'payment', 'billing', 'refund', 'cancel', 'not working', 'broken'
]

LOW_PRIORITY_WORDS: List[str] = [
    'suggestion', 'feature request', 'feedback', 'idea', 'would be nice'
]

# Default priority
DEFAULT_PRIORITY: str = 'medium'

# Escalation reasons
ESCALATION_REASON_BILLING: str = 'billing_issue'
ESCALATION_REASON_SECURITY: str = 'account_security'
ESCALATION_REASON_NO_DOCS: str = 'no_documentation'
ESCALATION_REASON_LOW_CONFIDENCE: str = 'low_confidence'

# Confidence scores
HIGH_CONFIDENCE_SCORE: float = 0.9
LOW_CONFIDENCE_SCORE: float = 0.5

# Conversation history limit (number of recent messages to include)
CONVERSATION_HISTORY_LIMIT: int = 10
