"""
Fallback Prompts for Bulletproof Operation

Provides error recovery prompts for various failure scenarios ensuring
investigation continuity regardless of system issues.
"""

from typing import Dict, Any


class FallbackPromptManager:
    """Manager for bulletproof fallback prompts handling error scenarios"""
    
    def __init__(self):
        self.fallback_prompts = self._initialize_fallback_prompts()
    
    def get_fallback_prompt(self, error_context: Dict[str, Any]) -> str:
        """Get appropriate fallback prompt for error scenario"""
        
        error_type = error_context.get("error_type", "general")
        fallback_template = self.fallback_prompts.get(
            error_type, 
            self.fallback_prompts["general"]
        )
        
        return fallback_template.format(**error_context)
    
    def _initialize_fallback_prompts(self) -> Dict[str, str]:
        """Initialize bulletproof fallback prompts"""
        
        return {
            "general": self._get_general_fallback_prompt(),
            "service_failure": self._get_service_failure_prompt(),
            "data_insufficient": self._get_data_insufficient_prompt(),
            "timeout": self._get_timeout_fallback_prompt(),
            "resource_exhaustion": self._get_resource_exhaustion_prompt()
        }
    
    def _get_general_fallback_prompt(self) -> str:
        """General bulletproof fallback prompt"""
        
        return """BULLETPROOF FALLBACK MODE - General Error Recovery

ERROR CONTEXT: {error_context}
INVESTIGATION: {investigation_id}

FALLBACK STRATEGY:
1. Assess available information and data quality
2. Provide best-effort analysis with clear limitations
3. Include confidence assessment reflecting constraints
4. Recommend next steps despite system limitations

REQUIRED: Provide valid JSON decision regardless of constraints."""

    def _get_service_failure_prompt(self) -> str:
        """Service failure specific fallback"""
        
        return """SERVICE FAILURE RECOVERY - Adaptive Strategy Selection

FAILED SERVICES: {failed_services}
AVAILABLE SERVICES: {available_services}

ADAPTATION REQUIREMENTS:
- Reconfigure agent selection based on service availability
- Lower confidence expectations appropriately  
- Provide alternative analysis approaches
- Maintain investigation momentum despite limitations"""

    def _get_data_insufficient_prompt(self) -> str:
        """Data insufficiency fallback"""
        
        return """DATA INSUFFICIENT MODE - Best Effort Analysis

AVAILABLE DATA: {available_data}
MISSING DATA: {missing_data}

APPROACH:
- Perform analysis with available data only
- Clearly document data limitations
- Provide confidence scoring reflecting data quality
- Recommend data collection strategies"""

    def _get_timeout_fallback_prompt(self) -> str:
        """Timeout scenario fallback"""
        
        return """TIMEOUT RECOVERY - Rapid Decision Mode

TIME REMAINING: {time_remaining}
CRITICAL REQUIREMENTS: Fast decision with available information

RAPID STRATEGY:
- Select most efficient agent combination
- Prioritize highest-confidence analysis paths
- Accept reduced thoroughness for timely completion
- Provide immediate actionable decision"""

    def _get_resource_exhaustion_prompt(self) -> str:
        """Resource exhaustion fallback"""
        
        return """RESOURCE EXHAUSTION - Minimal Resource Strategy

RESOURCE STATUS: {resource_status}
CONSTRAINTS: {resource_constraints}

EFFICIENCY MODE:
- Select single highest-impact agent
- Sequential execution only
- Minimal resource footprint
- Essential analysis only with clear prioritization"""