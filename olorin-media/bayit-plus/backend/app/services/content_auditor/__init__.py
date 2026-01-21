"""
Content Auditor Service

AI-powered content validation using Claude API for classification verification.

This module provides content auditing functionality including:
- Metadata completeness checking
- AI-powered classification verification
- AI insights generation

Backward Compatibility:
    All public functions are re-exported from this module to maintain
    backward compatibility with existing imports like:

    from app.services.content_auditor import audit_content_items
    from app.services.content_auditor import generate_ai_insights
"""

# Re-export main functions for backward compatibility
from app.services.content_auditor.ai_insights import generate_ai_insights
from app.services.content_auditor.classification_verifier import \
    ClassificationVerification
from app.services.content_auditor.metadata_auditor import (
    check_metadata_completeness, is_external_youtube_url)
from app.services.content_auditor.service import (ContentAuditorService,
                                                  audit_content_items,
                                                  verify_classifications)

__all__ = [
    # Main service class
    "ContentAuditorService",
    # Main audit function
    "audit_content_items",
    # Metadata checking
    "check_metadata_completeness",
    "is_external_youtube_url",
    # Classification verification
    "verify_classifications",
    "ClassificationVerification",
    # AI insights
    "generate_ai_insights",
]
