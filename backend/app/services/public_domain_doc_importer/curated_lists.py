"""Loads and validates curated documentary items from YAML config."""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

# Path to curated documentaries YAML config
_CONFIG_PATH = Path(__file__).resolve().parents[3] / "config" / "curated_documentaries.yaml"


class CuratedItem(BaseModel):
    """Schema for a single curated documentary item."""

    source_id: str
    title: str
    year: Optional[int] = None
    topic_tags: List[str] = Field(default_factory=list)
    priority: int = Field(default=3, ge=1, le=5)

    @field_validator("source_id")
    @classmethod
    def validate_source_id(cls, v: str) -> str:
        if not v or len(v) > 200:
            raise ValueError("source_id must be 1-200 characters")
        return v


class CuratedDocumentaryConfig(BaseModel):
    """Full curated documentaries config."""

    nasa: List[CuratedItem] = Field(default_factory=list)
    dvids: List[CuratedItem] = Field(default_factory=list)
    nara: List[CuratedItem] = Field(default_factory=list)


_cached_config: Optional[CuratedDocumentaryConfig] = None


def load_curated_config(
    config_path: Optional[Path] = None,
) -> CuratedDocumentaryConfig:
    """Load and validate curated documentaries from YAML config."""
    global _cached_config

    if _cached_config is not None:
        return _cached_config

    path = config_path or _CONFIG_PATH

    if not path.exists():
        logger.warning(
            "Curated documentaries config not found",
            extra={"path": str(path)},
        )
        return CuratedDocumentaryConfig()

    with open(path, "r") as f:
        raw_data = yaml.safe_load(f) or {}

    config = CuratedDocumentaryConfig(**raw_data)

    total = len(config.nasa) + len(config.dvids) + len(config.nara)
    logger.info(
        "Loaded curated documentaries config",
        extra={
            "nasa_count": len(config.nasa),
            "dvids_count": len(config.dvids),
            "nara_count": len(config.nara),
            "total": total,
        },
    )

    _cached_config = config
    return config


def get_curated_items(
    source: Optional[str] = None,
) -> Dict[str, List[CuratedItem]]:
    """Get curated items, optionally filtered by source."""
    config = load_curated_config()

    if source == "nasa":
        return {"nasa": config.nasa}
    elif source == "dvids":
        return {"dvids": config.dvids}
    elif source == "nara":
        return {"nara": config.nara}

    return {
        "nasa": config.nasa,
        "dvids": config.dvids,
        "nara": config.nara,
    }


def clear_cache() -> None:
    """Clear the cached config (for testing or reload)."""
    global _cached_config
    _cached_config = None
