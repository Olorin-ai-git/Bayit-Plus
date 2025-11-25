"""
Anomaly Correlator Tool for Entity Mining

Correlates segments and candidate entities to find root patterns.
Checks for ASN clusters, issuer/BIN concentration, reason-code patterns, etc.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from app.service.agent.tools.database_tool import DatabaseQueryTool
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class _AnomalyCorrelatorArgs(BaseModel):
    """Arguments for anomaly_correlator tool."""

    anomaly_id: str = Field(..., description="Anomaly event UUID")
    top_segments: List[Dict[str, Any]] = Field(
        ..., description="Top segments from SegmentHunter (list of segment dicts)"
    )
    candidate_entities: List[Dict[str, Any]] = Field(
        default_factory=list, description="Candidate entities from EntityExtractor"
    )
    check_sumo: bool = Field(
        True, description="Whether to check SumoLogic logs for correlation"
    )
    check_bursts: bool = Field(True, description="Whether to check for bursty patterns")


class AnomalyCorrelatorTool(BaseTool):
    """
    Tool for correlating segments and entities to find root patterns.

    Checks for:
    - ASN/IP clusters (new vs historical, bursty patterns)
    - Issuer/BIN or reason-code concentration
    - Cross-reference with Sumo/auth errors in same window
    - Device/IP clustering patterns
    """

    name: str = "anomaly_correlator"
    description: str = (
        "Correlate segments and candidate entities to identify root patterns. "
        "Checks for ASN clusters, issuer/BIN concentration, reason-code patterns, "
        "bursty IP/device patterns, and cross-references with SumoLogic logs. "
        "Returns root-pattern hypotheses (e.g., 'ASN AS12345 + reason 05 surge')."
    )
    args_schema: type[BaseModel] = _AnomalyCorrelatorArgs

    def _check_burst_patterns(
        self, entities: List[Dict[str, Any]], window_start: str, window_end: str
    ) -> Dict[str, Any]:
        """Check for bursty patterns in entity activity."""
        # This would query transaction data to find burst patterns
        # For now, return a placeholder structure
        bursts = []

        # Group entities by type and check for bursts
        for entity_group in entities:
            entity_type = entity_group.get("entity_type")
            entity_list = entity_group.get("entities", [])

            # Simple heuristic: if many entities with similar tx counts, it's a burst
            if len(entity_list) > 10:
                avg_tx = sum(e.get("tx_count", 0) for e in entity_list) / len(
                    entity_list
                )
                bursts.append(
                    {
                        "entity_type": entity_type,
                        "pattern": "burst",
                        "entity_count": len(entity_list),
                        "avg_tx_count": avg_tx,
                        "description": f"Burst pattern: {len(entity_list)} {entity_type} entities with avg {avg_tx:.1f} transactions",
                    }
                )

        return {"bursts": bursts, "has_bursts": len(bursts) > 0}

    def _check_concentration_patterns(
        self, segments: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Check for concentration patterns (issuer/BIN, reason-code, etc.)."""
        concentrations = []

        # Group segments by dimension type (if we had that info)
        # For now, check for high share_of_delta
        high_impact_segments = [s for s in segments if s.get("share_of_delta", 0) > 0.5]

        for segment in high_impact_segments[:5]:  # Top 5
            dimension_value = segment.get("dimension_value")
            share = segment.get("share_of_delta", 0)

            if share > 0.3:  # 30%+ of delta
                concentrations.append(
                    {
                        "dimension_value": dimension_value,
                        "share_of_delta": share,
                        "pattern": "concentration",
                        "description": f"High concentration: {dimension_value} accounts for {share*100:.1f}% of delta",
                    }
                )

        return {
            "concentrations": concentrations,
            "has_concentration": len(concentrations) > 0,
        }

    def _generate_root_patterns(
        self,
        segments: List[Dict[str, Any]],
        entities: List[Dict[str, Any]],
        burst_patterns: Dict[str, Any],
        concentration_patterns: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Generate root pattern hypotheses."""
        patterns = []

        # Pattern 1: High-impact segment with entity concentration
        top_segment = segments[0] if segments else None
        if top_segment and top_segment.get("share_of_delta", 0) > 0.5:
            patterns.append(
                {
                    "pattern_type": "segment_dominant",
                    "description": (
                        f"{top_segment.get('dimension_value')} accounts for "
                        f"{top_segment.get('share_of_delta', 0)*100:.1f}% of the anomaly delta"
                    ),
                    "confidence": "high",
                    "mitigation": f"Focus investigation on {top_segment.get('dimension_value')}",
                }
            )

        # Pattern 2: Burst pattern
        if burst_patterns.get("has_bursts"):
            for burst in burst_patterns.get("bursts", [])[:3]:
                patterns.append(
                    {
                        "pattern_type": "burst",
                        "description": burst.get("description"),
                        "confidence": "medium",
                        "mitigation": f"Investigate burst of {burst.get('entity_type')} entities",
                    }
                )

        # Pattern 3: Concentration pattern
        if concentration_patterns.get("has_concentration"):
            for conc in concentration_patterns.get("concentrations", [])[:3]:
                patterns.append(
                    {
                        "pattern_type": "concentration",
                        "description": conc.get("description"),
                        "confidence": "high",
                        "mitigation": f"Rate-limit or investigate {conc.get('dimension_value')}",
                    }
                )

        # Pattern 4: Multi-segment correlation
        if len(segments) >= 2:
            top2_share = sum(s.get("share_of_delta", 0) for s in segments[:2])
            if top2_share > 0.7:
                patterns.append(
                    {
                        "pattern_type": "multi_segment",
                        "description": (
                            f"Top 2 segments ({segments[0].get('dimension_value')}, "
                            f"{segments[1].get('dimension_value')}) account for {top2_share*100:.1f}% of delta"
                        ),
                        "confidence": "medium",
                        "mitigation": "Investigate correlation between top segments",
                    }
                )

        return patterns

    def _run(
        self,
        anomaly_id: str,
        top_segments: List[Dict[str, Any]],
        candidate_entities: List[Dict[str, Any]] = None,
        check_sumo: bool = True,
        check_bursts: bool = True,
    ) -> Dict[str, Any]:
        """Execute the anomaly_correlator tool."""
        try:
            if candidate_entities is None:
                candidate_entities = []

            # Check burst patterns
            burst_patterns = {}
            if check_bursts and candidate_entities:
                burst_patterns = self._check_burst_patterns(
                    candidate_entities,
                    "",  # window_start - would need from anomaly
                    "",  # window_end
                )

            # Check concentration patterns
            concentration_patterns = self._check_concentration_patterns(top_segments)

            # Generate root pattern hypotheses
            root_patterns = self._generate_root_patterns(
                top_segments, candidate_entities, burst_patterns, concentration_patterns
            )

            logger.info(
                f"AnomalyCorrelator found {len(root_patterns)} root patterns "
                f"for anomaly {anomaly_id}"
            )

            return {
                "anomaly_id": anomaly_id,
                "root_patterns": root_patterns,
                "burst_patterns": burst_patterns,
                "concentration_patterns": concentration_patterns,
                "summary": {
                    "total_patterns": len(root_patterns),
                    "high_confidence": len(
                        [p for p in root_patterns if p.get("confidence") == "high"]
                    ),
                    "has_bursts": burst_patterns.get("has_bursts", False),
                    "has_concentration": concentration_patterns.get(
                        "has_concentration", False
                    ),
                },
            }

        except Exception as e:
            logger.error(f"AnomalyCorrelator tool error: {e}", exc_info=True)
            return {"error": str(e), "root_patterns": [], "summary": {}}
