import asyncio
import json
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import aiohttp

# Removed non-existent tool imports
from app.service.agent.tools.vector_search_tool import VectorSearchTool
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)
logger.warning("=== LOCATION_DATA_CLIENT MODULE LOADED ===")


@dataclass
class LocationInfo:
    source: str
    location: Optional[Dict[str, Any]] = None
    confidence: float = 0.0
    timestamp: Optional[str] = None
    additional_info: Optional[Dict[str, Any]] = None


class LocationDataClient:
    def __init__(self):
        """Initialize the LocationDataClient."""
        self.session = None
        # Tool initialization removed - using real services only
        self.vector_search_tool = VectorSearchTool()

    async def connect(self):
        """Initialize client session."""
        if not self.session:
            self.session = aiohttp.ClientSession()

    async def close(self):
        """Close client session."""
        if self.session:
            await self.session.close()
            self.session = None

    async def analyze_transaction_patterns(
        self, splunk_results: List[Dict[str, Any]], user_id: str
    ) -> Dict[str, Any]:
        """Analyze transaction patterns using vector search to find similar records.

        Args:
            splunk_results: List of transaction records from Splunk
            user_id: The user ID being analyzed

        Returns:
            Dict containing vector search analysis results
        """
        logger.warning("=== ENTERING VECTOR SEARCH ANALYSIS === user_id=%s", user_id)

        if not splunk_results or len(splunk_results) < 2:
            logger.warning(
                "=== INSUFFICIENT DATA FOR VECTOR SEARCH === records=%d",
                len(splunk_results) if splunk_results else 0,
            )
            return {
                "analysis_status": "insufficient_data",
                "total_records": len(splunk_results) if splunk_results else 0,
                "message": "Need at least 2 records for similarity analysis",
            }

        try:
            # Use the most recent record as the target
            target_record = splunk_results[0]
            candidate_records = splunk_results[1:]  # All other records as candidates

            logger.warning("=== VECTOR SEARCH TARGET === %s", target_record)
            logger.warning(
                "=== VECTOR SEARCH CANDIDATES === %d records", len(candidate_records)
            )

            # Perform vector search
            search_result = await self.vector_search_tool._arun(
                target_record=target_record,
                candidate_records=candidate_records,
                max_results=10,
                distance_threshold=15.0,  # Match master branch threshold exactly
            )

            logger.warning("=== VECTOR SEARCH RESULT === %s", search_result)

            # Analyze the results for patterns
            analysis = {
                "analysis_status": "completed",
                "target_record": target_record,
                "total_records": len(splunk_results),
                "similar_records_found": len(search_result.get("similar_records", [])),
                "vector_search_result": search_result,
                "pattern_analysis": self._analyze_similarity_patterns(search_result),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            return analysis

        except Exception as e:
            logger.error("=== VECTOR SEARCH ERROR === %s", str(e), exc_info=True)
            return {
                "analysis_status": "error",
                "error": str(e),
                "total_records": len(splunk_results) if splunk_results else 0,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

    def _analyze_similarity_patterns(
        self, search_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze patterns in the similarity search results.

        Args:
            search_result: Result from vector search tool

        Returns:
            Dict containing pattern analysis
        """
        similar_records = search_result.get("similar_records", [])

        if not similar_records:
            return {"status": "no_similar_records"}

        # Analyze distance distribution
        distances = [record["distance"] for record in similar_records]

        # Count records by similarity level
        very_similar = len([d for d in distances if d <= 2.0])  # Very similar
        moderately_similar = len(
            [d for d in distances if 2.0 < d <= 5.0]
        )  # Moderately similar
        somewhat_similar = len(
            [d for d in distances if 5.0 < d <= 10.0]
        )  # Somewhat similar

        # Analyze common features
        common_features = self._identify_common_features(similar_records)

        return {
            "status": "analyzed",
            "similarity_distribution": {
                "very_similar": very_similar,
                "moderately_similar": moderately_similar,
                "somewhat_similar": somewhat_similar,
                "total": len(similar_records),
            },
            "distance_stats": search_result.get("metadata", {}).get(
                "distance_range", {}
            ),
            "common_features": common_features,
            "risk_indicators": self._assess_risk_indicators(similar_records),
        }

    def _identify_common_features(
        self, similar_records: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Identify common features across similar records."""
        if not similar_records:
            return {}

        # Extract records from the similarity results
        records = [record["record"] for record in similar_records]

        # Count common values for key fields
        common_features = {}

        key_fields = [
            "tm_smart_id",
            "tm_true_ip_geo",
            "tm_true_ip",
            "tm_http_os_signature",
            "tm_os_anomaly",
        ]

        for field in key_fields:
            values = [record.get(field) for record in records if record.get(field)]
            if values:
                # Count occurrences of each value
                value_counts = {}
                for value in values:
                    value_counts[value] = value_counts.get(value, 0) + 1

                # Find most common value
                most_common = (
                    max(value_counts.items(), key=lambda x: x[1])
                    if value_counts
                    else None
                )
                common_features[field] = {
                    "most_common_value": most_common[0] if most_common else None,
                    "frequency": most_common[1] if most_common else 0,
                    "total_records": len(values),
                    "unique_values": len(set(values)),
                }

        return common_features

    def _assess_risk_indicators(
        self, similar_records: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Assess risk indicators from similar records."""
        if not similar_records:
            return {"status": "no_data"}

        records = [record["record"] for record in similar_records]
        risk_indicators = {
            "proxy_usage": 0,
            "suspicious_bot_scores": 0,
            "os_anomalies": 0,
            "suspicious_color_depth": 0,
            "total_records": len(records),
        }

        for record in records:
            # Check for proxy usage
            if record.get("tm_proxy_ip"):
                risk_indicators["proxy_usage"] += 1

            # Check for high bot scores
            bot_score = record.get("tm_bb_bot_score")
            if bot_score and float(bot_score) > 500:
                risk_indicators["suspicious_bot_scores"] += 1

            # Check for OS anomalies
            if record.get("tm_os_anomaly"):
                risk_indicators["os_anomalies"] += 1

            # Check for suspicious color depth
            if record.get("tm_screen_color_depth") == "24":
                risk_indicators["suspicious_color_depth"] += 1

        # Calculate risk percentages
        total = risk_indicators["total_records"]
        risk_indicators["risk_percentages"] = {
            "proxy_usage": (
                (risk_indicators["proxy_usage"] / total * 100) if total > 0 else 0
            ),
            "suspicious_bot_scores": (
                (risk_indicators["suspicious_bot_scores"] / total * 100)
                if total > 0
                else 0
            ),
            "os_anomalies": (
                (risk_indicators["os_anomalies"] / total * 100) if total > 0 else 0
            ),
            "suspicious_color_depth": (
                (risk_indicators["suspicious_color_depth"] / total * 100)
                if total > 0
                else 0
            ),
        }

        return risk_indicators

    async def get_location_data(
        self,
        user_id: str,
        entity_type: str = "user_id",
        time_range: str = "30d",
    ) -> Dict[str, Any]:
        """Get location data for a user from all available sources.

        Args:
            user_id: The user ID to get location data for

        Returns:
            Dict with 'oii_results' (LocationInfo list), 'splunk_results' (list of dicts), and 'vector_analysis' (dict)
        """
        logger.warning("=== ENTERED get_location_data === user_id=%s", user_id)
        if not self.session:
            await self.connect()

        splunk_results = []
        vector_analysis = {}


        logger.warning("=== ENTERING SPLUNK BLOCK ===")
        # Get Splunk location (filter by user_id or device_id based on entity_type)
        logger.warning(
            "=== ABOUT TO RUN SPLUNK QUERY === entity=%s, type=%s, time_range=%s",
            user_id,
            entity_type,
            time_range,
        )
        try:
            from app.service.agent.tools.splunk_tool.splunk_tool import SplunkQueryTool
            from app.service.config import get_settings_for_env

            settings = get_settings_for_env()
            index = settings.splunk_index
            splunk_tool = SplunkQueryTool()
            # Choose filter field dynamically based on entity_type and apply time range
            filter_field = (
                "olorin_userid" if entity_type == "user_id" else "fuzzy_device_id"
            )
            spl_query = (
                f"search index={index} {filter_field}={user_id} earliest=-{time_range} "
                '| rex field=true_ip_city "(true_ip_city=(?<true_ip_city>.+))" '
                '| rex field=TrueIP_State "(TrueIP_State=(?<TrueIP_State>.+))" '
                '| rex field=true_ip_geo "(true_ip_geo=(?<true_ip_geo>.+))" '
                # Add vector search fields
                '| rex field=tm_smart_id "(tm_smart_id=(?<tm_smart_id>.+))" '
                '| rex field=tm_true_ip_geo "(tm_true_ip_geo=(?<tm_true_ip_geo>.+))" '
                '| rex field=tm_true_ip "(tm_true_ip=(?<tm_true_ip>.+))" '
                '| rex field=tm_proxy_ip "(tm_proxy_ip=(?<tm_proxy_ip>.+))" '
                '| rex field=rss_epoch_time "(rss_epoch_time=(?<rss_epoch_time>.+))" '
                '| rex field=tm_os_anomaly "(tm_os_anomaly=(?<tm_os_anomaly>.+))" '
                '| rex field=tm_http_os_signature "(tm_http_os_signature=(?<tm_http_os_signature>.+))" '
                '| rex field=tm_true_ip_longitude "(tm_true_ip_longitude=(?<tm_true_ip_longitude>.+))" '
                '| rex field=tm_true_ip_latitude "(tm_true_ip_latitude=(?<tm_true_ip_latitude>.+))" '
                '| rex field=tm_input_ip_longitude "(tm_input_ip_longitude=(?<tm_input_ip_longitude>.+))" '
                '| rex field=tm_input_ip_latitude "(tm_input_ip_latitude=(?<tm_input_ip_latitude>.+))" '
                '| rex field=tm_page_time_on "(tm_page_time_on=(?<tm_page_time_on>.+))" '
                '| rex field=tm_screen_color_depth "(tm_screen_color_depth=(?<tm_screen_color_depth>.+))" '
                '| rex field=tm_agent_public_key_hash_type "(tm_agent_public_key_hash_type=(?<tm_agent_public_key_hash_type>.+))" '
                '| rex field=tm_bb_bot_score "(tm_bb_bot_score=(?<tm_bb_bot_score>.+))" '
                "| eval city=urldecode(true_ip_city) "
                "| eval state=urldecode(TrueIP_State) "
                "| eval country=urldecode(true_ip_geo) "
                # Decode vector search fields
                "| eval tm_smart_id=urldecode(tm_smart_id) "
                "| eval tm_true_ip_geo=urldecode(tm_true_ip_geo) "
                "| eval tm_true_ip=urldecode(tm_true_ip) "
                "| eval tm_proxy_ip=urldecode(tm_proxy_ip) "
                "| eval rss_epoch_time=urldecode(rss_epoch_time) "
                "| eval tm_os_anomaly=urldecode(tm_os_anomaly) "
                "| eval tm_http_os_signature=urldecode(tm_http_os_signature) "
                "| eval tm_true_ip_longitude=urldecode(tm_true_ip_longitude) "
                "| eval tm_true_ip_latitude=urldecode(tm_true_ip_latitude) "
                "| eval tm_input_ip_longitude=urldecode(tm_input_ip_longitude) "
                "| eval tm_input_ip_latitude=urldecode(tm_input_ip_latitude) "
                "| eval tm_page_time_on=urldecode(tm_page_time_on) "
                "| eval tm_screen_color_depth=urldecode(tm_screen_color_depth) "
                "| eval tm_agent_public_key_hash_type=urldecode(tm_agent_public_key_hash_type) "
                "| eval tm_bb_bot_score=urldecode(tm_bb_bot_score) "
                "| table fuzzy_device_id, city, state, country, tm_smart_id, tm_true_ip_geo, tm_true_ip, tm_proxy_ip, rss_epoch_time, tm_os_anomaly, tm_http_os_signature, tm_true_ip_longitude, tm_true_ip_latitude, tm_input_ip_longitude, tm_input_ip_latitude, tm_page_time_on, tm_screen_color_depth, tm_agent_public_key_hash_type, tm_bb_bot_score, _time"
            )
            logger.warning("=== SPLUNK QUERY (UNFORMATTED) === %s", spl_query)
            logger.warning(
                "=== SPLUNK QUERY (FORMATTED) ===\n%s", spl_query.replace(" ", "\n")
            )
            # Execute the query using the formatted spl_query variable
            splunk_result = await splunk_tool.arun({"query": spl_query})
            logger.warning("=== SPLUNK RESULT === %s", splunk_result)
            # Add each result as a dict to splunk_results
            if isinstance(splunk_result, list):
                splunk_results = splunk_result
            elif (
                splunk_result
                and isinstance(splunk_result, dict)
                and splunk_result.get("results")
            ):
                splunk_results = splunk_result["results"]
        except Exception as e:
            logger.warning("=== SPLUNK QUERY ERROR === %s", str(e))

        # Perform vector search analysis on Splunk results
        logger.warning("=== ENTERING VECTOR SEARCH ANALYSIS BLOCK ===")
        try:
            vector_analysis = await self.analyze_transaction_patterns(
                splunk_results, user_id
            )
        except Exception as e:
            logger.warning("=== VECTOR SEARCH ANALYSIS ERROR === %s", str(e))
            vector_analysis = {
                "analysis_status": "error",
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        logger.warning(
            "=== END OF get_location_data, oii_results=%s, splunk_results=%s, vector_analysis=%s ===",
            oii_results,
            splunk_results,
            vector_analysis,
        )
        return {
            "oii_results": oii_results,
            "splunk_results": splunk_results,
            "vector_analysis": vector_analysis,
        }

    async def get_location_data_response(self, user_id: str) -> List[LocationInfo]:
        """Get location data for a user from all available sources (umbrella function)."""
        if not self.session:
            await self.connect()

        tasks = [
            self._get_oii_location(user_id),
            self.get_business_location(user_id),
            self.get_phone_location(user_id),
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_locations: List[LocationInfo] = []
        for res in results:
            if isinstance(res, Exception):
                logger.error(
                    f"Error fetching location data from one of the sources: {res}"
                )
                continue

            if res:
                if isinstance(res, list):
                    all_locations.extend(
                        loc_info
                        for loc_info in res
                        if isinstance(loc_info, LocationInfo)
                    )
                elif isinstance(res, LocationInfo):
                    all_locations.append(res)
                else:
                    logger.warning(
                        f"Unexpected result type in get_location_data_response: {type(res)}"
                    )

        return all_locations

    async def get_customer_location(self, user_id: str) -> List[LocationInfo]:
        """Get customer location information."""
        return await self.get_location_data(user_id)

    async def get_business_location(self, user_id: str) -> List[LocationInfo]:
        """Get business location information from multiple sources."""
        return [
            LocationInfo(
                source="Business Location",
                location=None,
                confidence=0.0,
                timestamp=datetime.now(timezone.utc).isoformat(),
                additional_info={"status": "unavailable"},
            )
        ]

    async def get_phone_location(self, user_id: str) -> List[LocationInfo]:
        """Get phone registration location from multiple sources."""
        return [
            LocationInfo(
                source="Phone Location",
                location=None,
                confidence=0.0,
                timestamp=datetime.now(timezone.utc).isoformat(),
                additional_info={"status": "unavailable"},
            )
        ]

    async def get_login_history(
        self, user_id: str, days: int = 30
    ) -> List[Dict[str, Any]]:
        """Get historical login information."""
        return [
            {
                "status": "unavailable",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ]

    async def get_login_patterns(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Analyze login patterns including time of day and frequency."""
        return {
            "status": "unavailable",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def get_mfa_method(self, user_id: str) -> Dict[str, Any]:
        """Get MFA method information."""
        return {
            "status": "unavailable",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # Internal methods for API calls
    async def _get_oii_location(self, user_id: str) -> Optional[LocationInfo]:
        """Internal stub for OII - main logic moved to get_oii_location_info for live data."""
        return LocationInfo(
            source="OII",
            location=None,
            confidence=0.0,
            timestamp=datetime.now(timezone.utc).isoformat(),
            additional_info={"status": "unavailable"},
        )

    # Salesforce and Ekata methods removed

    async def _get_business_admin_location(
        self, user_id: str
    ) -> Optional[LocationInfo]:
        """Get business location from Business Admin."""
        return LocationInfo(
            source="Business Admin",
            location=None,
            confidence=0.0,
            timestamp=datetime.now(timezone.utc).isoformat(),
            additional_info={"status": "unavailable"},
        )

    # Ekata phone location method removed

    async def _get_lexisnexis_phone_location(
        self, user_id: str
    ) -> Optional[LocationInfo]:
        """Get phone location from LexisNexis."""
        return LocationInfo(
            source="LexisNexis Phone",
            location=None,
            confidence=0.0,
            timestamp=datetime.now(timezone.utc).isoformat(),
            additional_info={"status": "unavailable"},
        )

    async def _get_kkdash_login_history(
        self, user_id: str, days: int
    ) -> List[Dict[str, Any]]:
        """Get login history from KKDash."""
        return [
            {
                "status": "unavailable",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ]

    async def _get_databricks_login_history(
        self, user_id: str, days: int
    ) -> List[Dict[str, Any]]:
        """Get historical login data from Databricks."""
        return [
            {
                "status": "unavailable",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ]

    async def _get_kkdash_mfa_info(self, user_id: str) -> Dict[str, Any]:
        """Get MFA information from KKDash."""
        return {
            "status": "unavailable",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

  
    async def get_business_location_info(self, user_id: str) -> Optional[LocationInfo]:
        """Get a single representative business location."""
        if not self.session:
            await self.connect()
        logger.info(f"Fetching representative Business location for user {user_id}")
        business_locations = await self.get_business_location(user_id)
        if business_locations and business_locations[0].location is not None:
            return business_locations[0]
        return LocationInfo(
            source="Business Location",
            location=None,
            confidence=0.0,
            timestamp=datetime.now(timezone.utc).isoformat(),
            additional_info={"status": "unavailable or no primary found"},
        )

    async def get_phone_location_info(self, user_id: str) -> Optional[LocationInfo]:
        """Get phone location info, requiring active session."""
        if not self.session:
            await self.connect()

        try:
            result = await self._get_lexisnexis_phone_location(user_id)

            # If None, return a fallback LocationInfo
            if result is None:
                return LocationInfo(
                    source="Phone Location",
                    location=None,
                    confidence=0.0,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    additional_info={"status": "unavailable"},
                )

            # Always return as "Phone Location" source regardless of underlying source
            return LocationInfo(
                source="Phone Location",
                location=result.location,
                confidence=result.confidence,
                timestamp=result.timestamp,
                additional_info=result.additional_info,
            )
        except Exception as e:
            logger.error(f"Error getting phone location info: {e}")
            return LocationInfo(
                source="Phone Location",
                confidence=0.0,
                timestamp=datetime.now(timezone.utc).isoformat(),
                additional_info={"status": "error", "error": str(e)},
            )
