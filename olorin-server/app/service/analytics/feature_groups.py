"""
Feature Grouping Utilities.

Provides categorization of features by type for analysis and reporting.
"""

from typing import List, Dict, Set


def categorize_features(selected_features: Set[str]) -> Dict[str, List[str]]:
    """
    Group features by category.

    Args:
        selected_features: Set of feature names to categorize

    Returns:
        Dictionary mapping category names to feature lists
    """
    groups = {
        "velocity": [],
        "geolocation": [],
        "amount": [],
        "device": [],
        "merchant": [],
        "entity": [],
        "pattern": [],
        "other": []
    }

    for feature in selected_features:
        feature_lower = feature.lower()

        if "velocity" in feature_lower or "tx_per" in feature_lower:
            groups["velocity"].append(feature)
        elif "geo" in feature_lower or "distance" in feature_lower or "location" in feature_lower:
            groups["geolocation"].append(feature)
        elif "amount" in feature_lower or "clustering" in feature_lower:
            groups["amount"].append(feature)
        elif "device" in feature_lower or "ip" in feature_lower:
            groups["device"].append(feature)
        elif "merchant" in feature_lower:
            groups["merchant"].append(feature)
        elif "entity" in feature_lower or "email" in feature_lower:
            groups["entity"].append(feature)
        elif "pattern" in feature_lower:
            groups["pattern"].append(feature)
        else:
            groups["other"].append(feature)

    # Remove empty groups
    groups = {k: v for k, v in groups.items() if v}

    return groups
