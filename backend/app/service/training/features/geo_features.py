"""
Geographic Features Extractor
Feature: 026-llm-training-pipeline

Extracts geographic and network risk features for fraud detection.
"""

import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.service.logging import get_bridge_logger
from app.service.training.features.feature_models import GeoFeatures

logger = get_bridge_logger(__name__)

EARTH_RADIUS_KM = 6371.0


class GeoFeatureExtractor:
    """Extracts geography-based features from transaction data."""

    def __init__(
        self,
        impossible_travel_km: float,
        impossible_travel_hours: float,
    ):
        """
        Initialize geo feature extractor.

        Args:
            impossible_travel_km: Distance threshold for impossible travel
            impossible_travel_hours: Time threshold for impossible travel
        """
        self._impossible_travel_km = impossible_travel_km
        self._impossible_travel_hours = impossible_travel_hours

    def extract(
        self,
        transactions: List[Dict[str, Any]],
        reference_time: datetime,
    ) -> GeoFeatures:
        """
        Extract geographic features from transaction list.

        Args:
            transactions: List of transaction dicts with geo data
            reference_time: Reference point for window calculations

        Returns:
            GeoFeatures with calculated values
        """
        if not transactions:
            return GeoFeatures()

        impossible_travel = self._detect_impossible_travel(transactions)
        country_metrics = self._calculate_country_metrics(transactions, reference_time)
        network_flags = self._extract_network_flags(transactions)

        return GeoFeatures(
            impossible_travel_flag=impossible_travel,
            unique_countries_7d=country_metrics.get("unique_7d", 0),
            country_diversity_score=country_metrics.get("diversity", 0.0),
            vpn_proxy_flag=network_flags.get("vpn_proxy", False),
            ip_reputation_score=network_flags.get("reputation", 0.0),
        )

    def _detect_impossible_travel(
        self, transactions: List[Dict[str, Any]]
    ) -> bool:
        """Detect impossible travel based on distance and time."""
        geo_transactions = self._get_geo_transactions(transactions)
        if len(geo_transactions) < 2:
            return False

        for i in range(len(geo_transactions) - 1):
            tx1 = geo_transactions[i]
            tx2 = geo_transactions[i + 1]

            distance_km = self._haversine_distance(
                tx1["lat"], tx1["lon"], tx2["lat"], tx2["lon"]
            )
            time_hours = abs((tx2["time"] - tx1["time"]).total_seconds()) / 3600

            if time_hours > 0 and time_hours <= self._impossible_travel_hours:
                if distance_km > self._impossible_travel_km:
                    return True
        return False

    def _get_geo_transactions(
        self, transactions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Extract transactions with valid geographic coordinates."""
        geo_txs = []
        for tx in transactions:
            lat = tx.get("IP_LATITUDE") or tx.get("LATITUDE")
            lon = tx.get("IP_LONGITUDE") or tx.get("LONGITUDE")
            tx_time = self._parse_time(tx.get("TX_DATETIME"))
            if lat is not None and lon is not None and tx_time:
                geo_txs.append({"lat": float(lat), "lon": float(lon), "time": tx_time})
        return sorted(geo_txs, key=lambda x: x["time"])

    def _haversine_distance(
        self, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        """Calculate distance between two points using Haversine formula."""
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return EARTH_RADIUS_KM * c

    def _calculate_country_metrics(
        self, transactions: List[Dict[str, Any]], reference_time: datetime
    ) -> Dict[str, Any]:
        """Calculate country diversity metrics."""
        window_7d = reference_time - timedelta(days=7)
        countries_7d = set()
        all_countries = set()

        for tx in transactions:
            country = tx.get("IP_COUNTRY_CODE") or tx.get("COUNTRY_CODE")
            if country:
                all_countries.add(country)
                tx_time = self._parse_time(tx.get("TX_DATETIME"))
                if tx_time and tx_time >= window_7d:
                    countries_7d.add(country)

        diversity = min(1.0, len(all_countries) / 10.0) if all_countries else 0.0

        return {
            "unique_7d": len(countries_7d),
            "diversity": round(diversity, 4),
        }

    def _extract_network_flags(
        self, transactions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Extract network-related risk flags."""
        vpn_count = 0
        reputation_scores = []

        for tx in transactions:
            ip_type = tx.get("IP_TYPE", "")
            if ip_type in ("vpn", "proxy", "tor", "datacenter"):
                vpn_count += 1
            rep_score = tx.get("IP_REPUTATION_SCORE")
            if rep_score is not None:
                reputation_scores.append(float(rep_score))

        vpn_proxy_flag = vpn_count > 0
        avg_reputation = (
            sum(reputation_scores) / len(reputation_scores)
            if reputation_scores
            else 0.0
        )

        return {
            "vpn_proxy": vpn_proxy_flag,
            "reputation": round(avg_reputation, 4),
        }

    def _parse_time(self, tx_time: Any) -> Optional[datetime]:
        """Parse transaction timestamp."""
        if tx_time is None:
            return None
        if isinstance(tx_time, datetime):
            return tx_time
        if isinstance(tx_time, str):
            try:
                return datetime.fromisoformat(tx_time.replace("Z", "+00:00"))
            except ValueError:
                return None
        return None
