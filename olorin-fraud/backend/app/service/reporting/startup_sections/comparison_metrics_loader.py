"""Comparison Metrics Data Loader for Startup Reports."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def load_comparison_results(
    data: Dict[str, Any],
) -> Tuple[List[Dict[str, Any]], Optional[Path]]:
    """Load comparison results from various sources."""
    comp_data = data["auto_comparisons"]
    results = comp_data.get("results", [])
    zip_dir = _resolve_zip_dir(data, comp_data)
    if not results and zip_dir and zip_dir.exists():
        results = _load_from_manifests(zip_dir) or _load_from_artifacts(zip_dir)
    return results, zip_dir


def _resolve_zip_dir(data: Dict[str, Any], comp_data: Dict[str, Any]) -> Optional[Path]:
    """Resolve the zip directory from various sources."""
    if data.get("_reports_dir"):
        return Path(data["_reports_dir"])
    if comp_data.get("zip_path"):
        return Path(comp_data["zip_path"]).parent
    output_path = data.get("_output_path")
    if output_path:
        output_path_obj = Path(output_path)
        if "comparison_package" in str(output_path_obj) or "auto_startup" in str(output_path_obj):
            return output_path_obj.parent if output_path_obj.is_file() else output_path_obj
    return None


def _load_from_manifests(zip_dir: Path) -> List[Dict[str, Any]]:
    """Load results from comparison_manifests.json."""
    manifests_file = zip_dir / "comparison_manifests.json"
    if not manifests_file.exists():
        return []
    try:
        with open(manifests_file, "r") as f:
            manifests = json.load(f)
        results = []
        for manifest in manifests:
            entity = manifest.get("entity", {})
            inv_id = manifest.get("metadata", {}).get("investigation_id") or manifest.get("left_investigation")
            if inv_id:
                results.append({"entity_type": entity.get("entity_type", "email"), "entity_value": entity.get("entity_id", "N/A"),
                               "investigation_id": inv_id, "status": "success", "comparison_response": None, "metrics": {}})
        return results
    except Exception:
        return []


def _load_from_artifacts(zip_dir: Path) -> List[Dict[str, Any]]:
    """Load results by discovering artifacts directly."""
    investigations_dir = zip_dir / "investigations"
    if not investigations_dir.exists():
        return []
    results = []
    for artifact_file in investigations_dir.rglob("*artifact.json"):
        try:
            with open(artifact_file, "r") as f:
                artifact_data = json.load(f)
            entity = artifact_data.get("entity", {})
            inv_id = extract_investigation_id_from_path(artifact_file)
            if inv_id:
                results.append({"entity_type": entity.get("type", "email"), "entity_value": entity.get("value", "N/A"),
                               "investigation_id": inv_id, "status": "success", "comparison_response": None, "metrics": {}})
        except Exception:
            pass
    return results


def extract_investigation_id_from_path(artifact_path: Path) -> Optional[str]:
    """Extract investigation ID from artifact file path."""
    path_str = str(artifact_path)
    if "INV_" in path_str:
        start = path_str.find("INV_")
        end_markers = ["/", "_artifact", ".json", "_"]
        end = len(path_str)
        for marker in end_markers:
            pos = path_str.find(marker, start + 4)
            if pos > 0 and pos < end:
                end = pos
        return path_str[start:end] if end > start else None
    return None


def load_artifact_data(
    result: Dict[str, Any],
    zip_dir: Optional[Path],
) -> Optional[Dict[str, Any]]:
    """Load artifact data for a specific comparison result."""
    investigation_id = result.get("investigation_id", "N/A")
    entity_value = result.get("entity_value", result.get("entity", "N/A"))
    entity_type = result.get("entity_type", "email")

    # Priority 1: Load from zip_dir/investigations/
    if zip_dir and zip_dir.exists():
        artifact_data = _load_from_zip_investigations(zip_dir, investigation_id, entity_value)
        if artifact_data:
            return artifact_data

    # Priority 2: Load from entity-based artifact directory
    return _load_from_entity_artifacts(entity_type, entity_value, investigation_id)


def _load_from_zip_investigations(
    zip_dir: Path,
    investigation_id: str,
    entity_value: str,
) -> Optional[Dict[str, Any]]:
    """Load artifact from zip_dir/investigations/."""
    investigations_dir = zip_dir / "investigations"
    if not investigations_dir.exists():
        return None

    for artifact_file in investigations_dir.rglob("*artifact.json"):
        if investigation_id != "N/A" and investigation_id in artifact_file.name:
            try:
                with open(artifact_file, "r") as f:
                    return json.load(f)
            except Exception:
                pass
    return None


def _load_from_entity_artifacts(
    entity_type: str,
    entity_value: str,
    investigation_id: str,
) -> Optional[Dict[str, Any]]:
    """Load artifact from entity-based artifact directory."""
    normalized_entity_id = entity_value.replace(".", "-").replace("@", "-at-")
    artifacts_base = Path("artifacts/investigations")

    candidate_dirs = [
        artifacts_base / entity_type / normalized_entity_id,
        artifacts_base / entity_type / entity_value.replace("@", "-at-"),
    ]

    for candidate_dir in candidate_dirs:
        if not candidate_dir.exists():
            continue

        artifact_files = list(candidate_dir.rglob("*artifact.json"))
        if not artifact_files:
            continue

        artifact_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)

        for artifact_file in artifact_files:
            if investigation_id != "N/A" and investigation_id in artifact_file.name:
                try:
                    with open(artifact_file, "r") as f:
                        return json.load(f)
                except Exception:
                    pass

        # Fallback to most recent
        try:
            with open(artifact_files[0], "r") as f:
                return json.load(f)
        except Exception:
            pass

    return None
