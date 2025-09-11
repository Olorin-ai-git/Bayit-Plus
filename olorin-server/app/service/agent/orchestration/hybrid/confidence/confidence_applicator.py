"""
Confidence State Application

This module applies consolidated confidence scores back to investigation
state and ensures all confidence fields are synchronized.
"""

from typing import Dict, Any

from app.service.logging import get_bridge_logger
from .confidence_models import ConsolidatedConfidence

logger = get_bridge_logger(__name__)


class ConfidenceApplicator:
    """Applies consolidated confidence back to investigation state."""
    
    def apply_consolidated_confidence(
        self, 
        state: Dict[str, Any], 
        consolidated: ConsolidatedConfidence
    ) -> Dict[str, Any]:
        """
        Apply consolidated confidence back to the investigation state.
        
        This standardizes all confidence fields to use the consolidated values
        and adds comprehensive metadata for tracking.
        
        Args:
            state: Investigation state to update
            consolidated: Consolidated confidence data
            
        Returns:
            Updated state with synchronized confidence values
        """
        
        logger.debug(f"Applying consolidated confidence {consolidated.overall_score:.3f} to state")
        
        # Update primary confidence fields
        self._update_primary_confidence_fields(state, consolidated)
        
        # Add comprehensive consolidation metadata
        self._add_consolidation_metadata(state, consolidated)
        
        # Log the application results
        self._log_application_results(consolidated)
        
        return state
    
    def _update_primary_confidence_fields(
        self, 
        state: Dict[str, Any], 
        consolidated: ConsolidatedConfidence
    ):
        """Update the main confidence fields in state."""
        
        # Set primary confidence fields to consolidated overall score
        self._safe_set_confidence(state, "confidence", consolidated.overall_score)
        self._safe_set_confidence(state, "confidence_score", consolidated.overall_score)
        
        # Set AI confidence to component value or overall if not available
        ai_confidence = consolidated.ai_confidence or consolidated.overall_score
        self._safe_set_confidence(state, "ai_confidence", ai_confidence)
        
        # Set evidence confidence if available
        if consolidated.evidence_confidence is not None:
            self._safe_set_confidence(state, "evidence_confidence", consolidated.evidence_confidence)
        
        logger.debug(f"Updated primary confidence fields to {consolidated.overall_score:.3f}")
    
    def _add_consolidation_metadata(
        self, 
        state: Dict[str, Any], 
        consolidated: ConsolidatedConfidence
    ):
        """Add comprehensive metadata about the consolidation process."""
        
        metadata = {
            "overall_score": consolidated.overall_score,
            "level_description": consolidated.level_description,
            "consistency_score": consolidated.consistency_score,
            "reliability_score": consolidated.reliability_score,
            "data_quality_issues": consolidated.data_quality_issues,
            "component_breakdown": {
                "ai_confidence": consolidated.ai_confidence,
                "evidence_confidence": consolidated.evidence_confidence,
                "tool_confidence": consolidated.tool_confidence,
                "domain_confidence": consolidated.domain_confidence
            },
            "source_fields": consolidated.source_fields,
            "timestamp": consolidated.calculation_timestamp,
            "method": consolidated.consolidation_method
        }
        
        # Add quality indicators
        metadata["quality_indicators"] = {
            "has_consistency_issues": len(consolidated.data_quality_issues) > 0,
            "reliability_rating": self._get_reliability_rating(consolidated.reliability_score),
            "consistency_rating": self._get_consistency_rating(consolidated.consistency_score),
            "source_count": len(consolidated.source_fields)
        }
        
        state["confidence_consolidation"] = metadata
        
        logger.debug(f"Added consolidation metadata with {len(consolidated.source_fields)} sources")
    
    def _safe_set_confidence(self, state, field_name, value):
        """Safely set confidence value in state (supports both dict and object)."""
        try:
            # Try dictionary access first
            if isinstance(state, dict):
                state[field_name] = value
            # Try attribute access for objects
            elif hasattr(state, field_name):
                setattr(state, field_name, value)
            # If object doesn't have the attribute, try to set it anyway
            else:
                try:
                    setattr(state, field_name, value)
                except AttributeError:
                    # If we can't set as attribute, treat as dict
                    if hasattr(state, '__setitem__'):
                        state[field_name] = value
        except Exception as e:
            logger.warning(f"Failed to set confidence field {field_name}: {e}")
    
    def _get_reliability_rating(self, reliability_score: float) -> str:
        """Convert reliability score to human-readable rating."""
        if reliability_score >= 0.8:
            return "HIGH"
        elif reliability_score >= 0.6:
            return "MEDIUM"
        elif reliability_score >= 0.4:
            return "LOW"
        else:
            return "POOR"
    
    def _get_consistency_rating(self, consistency_score: float) -> str:
        """Convert consistency score to human-readable rating."""
        if consistency_score >= 0.9:
            return "EXCELLENT"
        elif consistency_score >= 0.7:
            return "GOOD"
        elif consistency_score >= 0.5:
            return "FAIR"
        else:
            return "POOR"
    
    def _log_application_results(self, consolidated: ConsolidatedConfidence):
        """Log the results of applying consolidated confidence."""
        logger.debug(f"✅ Applied consolidated confidence {consolidated.overall_score:.3f} ({consolidated.level_description})")
        logger.debug(f"   Consistency: {consolidated.consistency_score:.3f} | Reliability: {consolidated.reliability_score:.3f}")
        
        if consolidated.data_quality_issues:
            logger.warning(f"   Data quality issues: {len(consolidated.data_quality_issues)} detected")
            for issue in consolidated.data_quality_issues[:3]:  # Log first 3 issues
                logger.warning(f"     - {issue}")
            if len(consolidated.data_quality_issues) > 3:
                logger.warning(f"     ... and {len(consolidated.data_quality_issues) - 3} more")
    
    def extract_confidence_summary(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract a summary of confidence information from state.
        
        Args:
            state: Investigation state
            
        Returns:
            Dictionary with confidence summary
        """
        summary = {
            "primary_confidence": self._safe_get_confidence(state, "confidence"),
            "ai_confidence": self._safe_get_confidence(state, "ai_confidence"),
            "evidence_confidence": self._safe_get_confidence(state, "evidence_confidence"),
            "has_consolidation_data": "confidence_consolidation" in state
        }
        
        # Add consolidation data if available
        if "confidence_consolidation" in state:
            consolidation = state["confidence_consolidation"]
            summary.update({
                "overall_score": consolidation.get("overall_score"),
                "level_description": consolidation.get("level_description"),
                "consistency_score": consolidation.get("consistency_score"),
                "reliability_score": consolidation.get("reliability_score"),
                "issue_count": len(consolidation.get("data_quality_issues", [])),
                "source_count": len(consolidation.get("source_fields", {}))
            })
        
        return summary
    
    def _safe_get_confidence(self, state, field_name):
        """Safely get confidence value from state."""
        try:
            if isinstance(state, dict):
                return state.get(field_name)
            elif hasattr(state, field_name):
                return getattr(state, field_name)
            else:
                return None
        except Exception:
            return None