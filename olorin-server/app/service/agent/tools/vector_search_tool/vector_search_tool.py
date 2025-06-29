import time
from decimal import Decimal
from typing import Any, Dict, List, Optional

import numpy as np
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field


def distance_function(t1: Dict[str, Any], t2: Dict[str, Any]) -> float:
    """
    Calculate the distance between two transaction records based on various features.

    Args:
        t1: First transaction record
        t2: Second transaction record

    Returns:
        float: Distance value between 0 and 21 (lower means more similar)
    """
    smartIdDistance = (
        0
        if "tm_smart_id" in t1
        and "tm_smart_id" in t2
        and t1["tm_smart_id"] is not None
        and t2["tm_smart_id"] is not None
        and t1["tm_smart_id"] == t2["tm_smart_id"]
        else 1
    )

    trueIpGeoDistance = (
        0
        if "tm_true_ip_geo" in t1
        and "tm_true_ip_geo" in t2
        and t1["tm_true_ip_geo"] is not None
        and t2["tm_true_ip_geo"] is not None
        and t1["tm_true_ip_geo"] == t2["tm_true_ip_geo"]
        else 1
    )

    trueIpDistance = (
        0
        if "tm_true_ip" in t1
        and "tm_true_ip" in t2
        and t1["tm_true_ip"] is not None
        and t2["tm_true_ip"] is not None
        and t1["tm_true_ip"] == t2["tm_true_ip"]
        else 1
    )

    t1hasProxy = (
        1
        if "tm_proxy_ip" in t1 and t1["tm_proxy_ip"] is not None and t1["tm_proxy_ip"]
        else 0
    )
    t2hasProxy = (
        1
        if "tm_proxy_ip" in t2 and t2["tm_proxy_ip"] is not None and t2["tm_proxy_ip"]
        else 0
    )

    hasProxyDistance = abs(t1hasProxy - t2hasProxy)

    timeOfDayDistance = 0
    if (
        "rss_epoch_time" in t1
        and "rss_epoch_time" in t2
        and t1["rss_epoch_time"] is not None
        and t2["rss_epoch_time"] is not None
    ):
        try:
            t1timestamp = (
                int(t1["rss_epoch_time"])
                if isinstance(t1["rss_epoch_time"], str)
                else t1["rss_epoch_time"]
            )
            t2timestamp = (
                int(t2["rss_epoch_time"])
                if isinstance(t2["rss_epoch_time"], str)
                else t2["rss_epoch_time"]
            )
            t1hour = time.strftime("%H", time.localtime(t1timestamp / 1000))
            t2hour = time.strftime("%H", time.localtime(t2timestamp / 1000))
            timeOfDayDistance = abs(int(t1hour) - int(t2hour)) / 24
        except (ValueError, TypeError):
            timeOfDayDistance = 0

    osAnomalyDistance = (
        0
        if "tm_os_anomaly" in t1
        and "tm_os_anomaly" in t2
        and t1["tm_os_anomaly"] is not None
        and t2["tm_os_anomaly"] is not None
        and t1["tm_os_anomaly"] == t2["tm_os_anomaly"]
        else 1
    )

    windows1 = (
        1
        if "tm_http_os_signature" in t1
        and t1["tm_http_os_signature"] is not None
        and "windows" in str(t1["tm_http_os_signature"]).lower()
        else 0
    )
    windows2 = (
        1
        if "tm_http_os_signature" in t2
        and t2["tm_http_os_signature"] is not None
        and "windows" in str(t2["tm_http_os_signature"]).lower()
        else 0
    )

    mac1 = (
        1
        if "tm_http_os_signature" in t1
        and t1["tm_http_os_signature"] is not None
        and "mac" in str(t1["tm_http_os_signature"]).lower()
        else 0
    )
    mac2 = (
        1
        if "tm_http_os_signature" in t2
        and t2["tm_http_os_signature"] is not None
        and "mac" in str(t2["tm_http_os_signature"]).lower()
        else 0
    )

    linux1 = (
        1
        if "tm_http_os_signature" in t1
        and t1["tm_http_os_signature"] is not None
        and (
            "linux" in str(t1["tm_http_os_signature"]).lower()
            or "freebsd" in str(t1["tm_http_os_signature"]).lower()
        )
        else 0
    )
    linux2 = (
        1
        if "tm_http_os_signature" in t2
        and t2["tm_http_os_signature"] is not None
        and (
            "linux" in str(t2["tm_http_os_signature"]).lower()
            or "freebsd" in str(t2["tm_http_os_signature"]).lower()
        )
        else 0
    )

    ios1 = (
        1
        if "tm_http_os_signature" in t1
        and t1["tm_http_os_signature"] is not None
        and "ios" in str(t1["tm_http_os_signature"]).lower()
        else 0
    )
    ios2 = (
        1
        if "tm_http_os_signature" in t2
        and t2["tm_http_os_signature"] is not None
        and "ios" in str(t2["tm_http_os_signature"]).lower()
        else 0
    )

    android1 = (
        1
        if "tm_http_os_signature" in t1
        and t1["tm_http_os_signature"] is not None
        and "android" in str(t1["tm_http_os_signature"]).lower()
        else 0
    )
    android2 = (
        1
        if "tm_http_os_signature" in t2
        and t2["tm_http_os_signature"] is not None
        and "android" in str(t2["tm_http_os_signature"]).lower()
        else 0
    )

    osDistance = (
        abs(windows1 - windows2)
        + abs(mac1 - mac2)
        + abs(linux1 - linux2)
        + abs(ios1 - ios2)
        + abs(android1 - android2)
    )

    longitudeDistance = 0
    latitudeDistance = 0
    if (
        "tm_true_ip_longitude" in t1
        and "tm_input_ip_longitude" in t1
        and "tm_true_ip_longitude" in t2
        and "tm_input_ip_longitude" in t2
    ):
        if (
            t1["tm_true_ip_longitude"] is not None
            and t1["tm_input_ip_longitude"] is not None
            and t2["tm_true_ip_longitude"] is not None
            and t2["tm_input_ip_longitude"] is not None
        ):
            try:
                longitude1 = (
                    float(
                        t1["tm_true_ip_longitude"]
                        or t1["tm_input_ip_longitude"]
                        or -122.083855
                    )
                    / 360
                ) + 0.5
                longitude2 = (
                    float(
                        t2["tm_true_ip_longitude"]
                        or t2["tm_input_ip_longitude"]
                        or -122.083855
                    )
                    / 360
                ) + 0.5
                longitudeDistance = abs(longitude1 - longitude2)

                latitude1 = (
                    float(
                        t1["tm_true_ip_latitude"]
                        or t1["tm_input_ip_latitude"]
                        or 37.3861
                    )
                    / 180
                ) + 0.5
                latitude2 = (
                    float(
                        t2["tm_true_ip_latitude"]
                        or t2["tm_input_ip_latitude"]
                        or 37.3861
                    )
                    / 180
                ) + 0.5
                latitudeDistance = abs(latitude1 - latitude2)
            except (ValueError, TypeError):
                longitudeDistance = 0
                latitudeDistance = 0

    pageTimeOnDistance = 0
    if (
        "tm_page_time_on" in t1
        and "tm_page_time_on" in t2
        and t1["tm_page_time_on"] is not None
        and t2["tm_page_time_on"] is not None
    ):
        try:
            pageTimeOn1_val = (
                float(t1["tm_page_time_on"])
                if isinstance(t1["tm_page_time_on"], str)
                else t1["tm_page_time_on"]
            )
            pageTimeOn2_val = (
                float(t2["tm_page_time_on"])
                if isinstance(t2["tm_page_time_on"], str)
                else t2["tm_page_time_on"]
            )
            pageTimeOn1 = 1 if pageTimeOn1_val > 60000 else pageTimeOn1_val / 60000
            pageTimeOn2 = 1 if pageTimeOn2_val > 60000 else pageTimeOn2_val / 60000
            pageTimeOnDistance = abs(float(pageTimeOn1) - float(pageTimeOn2))
        except (ValueError, TypeError):
            pageTimeOnDistance = 0

    suspicousColorDepthDistance = 0
    if (
        "tm_screen_color_depth" in t1
        and "tm_screen_color_depth" in t2
        and t1["tm_screen_color_depth"] is not None
        and t2["tm_screen_color_depth"] is not None
    ):
        t1scd = str(t1["tm_screen_color_depth"])
        t2scd = str(t2["tm_screen_color_depth"])
        suspicousColorDepthDistance = (
            1 if ((t1scd != t2scd) and (t1scd == "24" or t2scd == "24")) else 0
        )

    suspicousAgentPublicKeyHashTypeDistance = 0
    if (
        "tm_agent_public_key_hash_type" in t1
        and "tm_agent_public_key_hash_type" in t2
        and t1["tm_agent_public_key_hash_type"] is not None
        and t2["tm_agent_public_key_hash_type"] is not None
    ):
        t1apkht = str(t1["tm_agent_public_key_hash_type"])
        t2apkht = str(t2["tm_agent_public_key_hash_type"])
        suspicousAgentPublicKeyHashTypeDistance = (
            1
            if (
                (t1apkht != t2apkht)
                and (t1apkht == "web:ecdsa" or t2apkht == "web:ecdsa")
            )
            else 0
        )

    suspicousBbBotScoreDistance = 0
    if (
        "tm_bb_bot_score" in t1
        and "tm_bb_bot_score" in t2
        and t1["tm_bb_bot_score"] is not None
        and t2["tm_bb_bot_score"] is not None
    ):
        try:
            t1bbbscore = str(t1["tm_bb_bot_score"])
            t2bbbscore = str(t2["tm_bb_bot_score"])
            suspicousBbBotScoreDistance = (
                1
                if (
                    (Decimal(t1bbbscore) > 500 and Decimal(t2bbbscore) < 500)
                    or (Decimal(t1bbbscore) < 500 and Decimal(t2bbbscore) > 500)
                )
                else 0
            )
        except (ValueError, TypeError):
            suspicousBbBotScoreDistance = 0

    distance = (
        smartIdDistance * 2
        + trueIpGeoDistance * 3
        + trueIpDistance
        + hasProxyDistance * 2
        + float(timeOfDayDistance)
        + osAnomalyDistance * 2
        + osDistance * 2
        + float(longitudeDistance)
        + float(latitudeDistance)
        + float(pageTimeOnDistance)
        + suspicousColorDepthDistance * 2
        + suspicousAgentPublicKeyHashTypeDistance * 2
        + suspicousBbBotScoreDistance * 2
    )  # max is 21

    return distance


class _VectorSearchArgs(BaseModel):
    """Arguments for the vector search tool."""

    target_record: Dict[str, Any] = Field(
        ..., description="The target transaction record to find similar records for."
    )
    candidate_records: List[Dict[str, Any]] = Field(
        ..., description="List of candidate transaction records to compare against."
    )
    max_results: Optional[int] = Field(
        default=10, description="Maximum number of similar records to return."
    )
    distance_threshold: Optional[float] = Field(
        default=None,
        description="Maximum distance threshold for similarity (records with distance > threshold will be filtered out).",
    )


class VectorSearchTool(BaseTool):
    """
    LangChain tool that performs vector-based similarity search on transaction records.

    This tool uses a custom distance function to find similar transaction records based on
    various features like smart ID, IP geolocation, OS signatures, and behavioral patterns.
    """

    name: str = "vector_search_tool"
    description: str = (
        "Performs similarity search on transaction records using a custom distance function. "
        "Finds the most similar records to a target record based on features like smart ID, "
        "IP geolocation, OS signatures, proxy usage, time patterns, and behavioral indicators. "
        "Returns records sorted by similarity (lowest distance first)."
    )

    # Explicit args schema so the tool is treated as *strict* for auto-parsing
    args_schema: type[BaseModel] = _VectorSearchArgs

    def _run(
        self,
        target_record: Dict[str, Any],
        candidate_records: List[Dict[str, Any]],
        max_results: Optional[int] = 10,
        distance_threshold: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Synchronous execution wrapper that delegates to asyncio for compatibility."""
        import asyncio

        return asyncio.run(
            self._arun(
                target_record, candidate_records, max_results, distance_threshold
            )
        )

    async def _arun(
        self,
        target_record: Dict[str, Any],
        candidate_records: List[Dict[str, Any]],
        max_results: Optional[int] = 10,
        distance_threshold: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Async execution of the vector search.
        """
        # Input validation for error handling
        if not isinstance(target_record, dict) or not target_record:
            return {
                "error": "Vector search failed: target_record is missing or invalid",
                "target_record": target_record,
                "total_candidates": len(candidate_records) if candidate_records else 0,
                "total_results": 0,
            }
        try:
            # Calculate distances for all candidate records
            results = []
            for i, candidate in enumerate(candidate_records):
                distance = distance_function(target_record, candidate)

                # Apply distance threshold filter if specified
                if distance_threshold is None or distance <= distance_threshold:
                    results.append(
                        {"record": candidate, "distance": distance, "index": i}
                    )

            # Sort by distance (most similar first)
            results.sort(key=lambda x: x["distance"])

            # Limit results if max_results is specified
            if max_results is not None:
                results = results[:max_results]

            # Prepare response
            response = {
                "target_record": target_record,
                "similar_records": results,
                "total_candidates": len(candidate_records),
                "total_results": len(results),
                "max_results": max_results,
                "distance_threshold": distance_threshold,
                "metadata": {
                    "distance_range": {
                        "min": (
                            min([r["distance"] for r in results]) if results else None
                        ),
                        "max": (
                            max([r["distance"] for r in results]) if results else None
                        ),
                        "avg": (
                            sum([r["distance"] for r in results]) / len(results)
                            if results
                            else None
                        ),
                    }
                },
            }

            return response

        except Exception as e:
            return {
                "error": f"Vector search failed: {str(e)}",
                "target_record": target_record,
                "total_candidates": len(candidate_records) if candidate_records else 0,
                "total_results": 0,
            }
