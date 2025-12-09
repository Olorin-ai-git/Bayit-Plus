"""
Prompt Registry
Feature: 026-llm-training-pipeline

Manages versioned prompt templates for LLM-based fraud detection.
Supports loading, caching, and version rollback of prompts.
"""

import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from pydantic import BaseModel, Field

from app.service.logging import get_bridge_logger
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)


class PromptVersion(BaseModel):
    """Metadata for a prompt version."""

    version: str = Field(description="Version identifier (e.g., v1)")
    created_at: str = Field(description="Creation timestamp")
    description: str = Field(description="Version description")
    file_path: str = Field(description="Path to prompt file")
    is_active: bool = Field(default=False, description="Currently active version")
    metrics: Optional[Dict[str, float]] = Field(default=None)


class PromptTemplate(BaseModel):
    """Loaded prompt template with all components."""

    version: str
    system_prompt: str
    fraud_analysis_prompt: str
    fraud_indicators_template: str
    velocity_analysis_template: str
    geographic_analysis_template: str
    device_analysis_template: str
    historical_patterns_template: str
    batch_analysis_prompt: str
    feedback_analysis_prompt: str


class PromptRegistry:
    """Registry for managing prompt versions and templates."""

    def __init__(self):
        """Initialize prompt registry."""
        self._config = get_training_config()
        self._prompts_dir = self._get_prompts_directory()
        self._cache: Dict[str, PromptTemplate] = {}
        self._versions: Dict[str, PromptVersion] = {}
        self._active_version: Optional[str] = None
        self._load_available_versions()

    def _get_prompts_directory(self) -> Path:
        """Get prompts directory from config."""
        prompts_dir = os.getenv(
            "LLM_PROMPTS_DIRECTORY", self._config.prompts.prompts_directory
        )
        path = Path(prompts_dir)
        if not path.is_absolute():
            path = Path(__file__).parent.parent.parent.parent / prompts_dir
        return path

    def _load_available_versions(self) -> None:
        """Scan prompts directory and load available versions."""
        if not self._prompts_dir.exists():
            logger.warning(f"Prompts directory not found: {self._prompts_dir}")
            return

        for yaml_file in self._prompts_dir.glob("fraud_detection_*.yaml"):
            try:
                with open(yaml_file, "r") as f:
                    data = yaml.safe_load(f)

                version = data.get("version", "unknown")
                self._versions[version] = PromptVersion(
                    version=version,
                    created_at=data.get("created_at", ""),
                    description=data.get("description", ""),
                    file_path=str(yaml_file),
                    is_active=(version == self._config.prompts.active_version),
                )

                if version == self._config.prompts.active_version:
                    self._active_version = version

                logger.debug(f"Found prompt version: {version}")
            except Exception as e:
                logger.error(f"Error loading prompt file {yaml_file}: {e}")

        logger.info(f"Loaded {len(self._versions)} prompt versions")

    def get_active_version(self) -> str:
        """Get the currently active prompt version."""
        if self._active_version:
            return self._active_version
        return self._config.prompts.active_version

    def get_prompt_template(self, version: Optional[str] = None) -> PromptTemplate:
        """
        Get prompt template for specified version.

        Args:
            version: Version to load. Uses active version if not specified.

        Returns:
            PromptTemplate with all prompt components

        Raises:
            ValueError: If version not found
        """
        version = version or self.get_active_version()

        if self._config.prompts.cache_enabled and version in self._cache:
            logger.debug(f"Using cached prompt template: {version}")
            return self._cache[version]

        if version not in self._versions:
            raise ValueError(f"Prompt version not found: {version}")

        version_info = self._versions[version]
        template = self._load_template_file(version_info.file_path)

        if self._config.prompts.cache_enabled:
            self._cache[version] = template

        return template

    def _load_template_file(self, file_path: str) -> PromptTemplate:
        """Load prompt template from YAML file."""
        with open(file_path, "r") as f:
            data = yaml.safe_load(f)

        return PromptTemplate(
            version=data["version"],
            system_prompt=data["system_prompt"],
            fraud_analysis_prompt=data["fraud_analysis_prompt"],
            fraud_indicators_template=data["fraud_indicators_template"],
            velocity_analysis_template=data["velocity_analysis_template"],
            geographic_analysis_template=data["geographic_analysis_template"],
            device_analysis_template=data["device_analysis_template"],
            historical_patterns_template=data["historical_patterns_template"],
            batch_analysis_prompt=data["batch_analysis_prompt"],
            feedback_analysis_prompt=data["feedback_analysis_prompt"],
        )

    def list_versions(self) -> List[PromptVersion]:
        """List all available prompt versions."""
        return list(self._versions.values())

    def set_active_version(self, version: str) -> None:
        """Set the active prompt version."""
        if version not in self._versions:
            raise ValueError(f"Version not found: {version}")

        for v in self._versions.values():
            v.is_active = False

        self._versions[version].is_active = True
        self._active_version = version
        logger.info(f"Active prompt version set to: {version}")

    def update_version_metrics(self, version: str, metrics: Dict[str, float]) -> None:
        """Update performance metrics for a prompt version."""
        if version in self._versions:
            self._versions[version].metrics = metrics
            logger.debug(f"Updated metrics for {version}: {metrics}")

    def save_new_version(self, template: PromptTemplate, description: str) -> str:
        """
        Save a new prompt version.

        Args:
            template: PromptTemplate to save
            description: Description of changes

        Returns:
            New version identifier
        """
        existing_versions = [v for v in self._versions.keys() if v.startswith("v")]
        version_nums = [int(v[1:]) for v in existing_versions if v[1:].isdigit()]
        new_version_num = max(version_nums, default=0) + 1
        new_version = f"v{new_version_num}"

        file_path = self._prompts_dir / f"fraud_detection_{new_version}.yaml"

        template_data = {
            "version": new_version,
            "created_at": datetime.utcnow().isoformat(),
            "description": description,
            "system_prompt": template.system_prompt,
            "fraud_analysis_prompt": template.fraud_analysis_prompt,
            "fraud_indicators_template": template.fraud_indicators_template,
            "velocity_analysis_template": template.velocity_analysis_template,
            "geographic_analysis_template": template.geographic_analysis_template,
            "device_analysis_template": template.device_analysis_template,
            "historical_patterns_template": template.historical_patterns_template,
            "batch_analysis_prompt": template.batch_analysis_prompt,
            "feedback_analysis_prompt": template.feedback_analysis_prompt,
        }

        with open(file_path, "w") as f:
            yaml.dump(template_data, f, default_flow_style=False, allow_unicode=True)

        self._versions[new_version] = PromptVersion(
            version=new_version,
            created_at=template_data["created_at"],
            description=description,
            file_path=str(file_path),
            is_active=False,
        )

        logger.info(f"Saved new prompt version: {new_version}")
        return new_version

    def clear_cache(self) -> None:
        """Clear the prompt cache."""
        self._cache.clear()
        logger.debug("Prompt cache cleared")


_prompt_registry: Optional[PromptRegistry] = None


def get_prompt_registry() -> PromptRegistry:
    """Get cached prompt registry instance."""
    global _prompt_registry
    if _prompt_registry is None:
        _prompt_registry = PromptRegistry()
    return _prompt_registry
