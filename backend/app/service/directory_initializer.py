"""
Directory Initialization Module

Ensures all required directories for the application are created at startup.
This prevents FileNotFoundError exceptions when the application tries to write files.

All directory paths are configuration-driven (no hardcoded values).
"""

import os
from pathlib import Path
from typing import List

from app.config.file_organization_config import FileOrganizationConfig
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


def ensure_required_directories() -> None:
    """
    Ensure all required directories exist, creating them if necessary.
    
    This function should be called during application startup to prevent
    FileNotFoundError exceptions during normal operation.
    
    All directory paths come from configuration (FileOrganizationConfig).
    """
    logger.info("📁 Ensuring required directories exist...")
    
    config = FileOrganizationConfig()
    
    # Define all required directories
    required_dirs = _get_required_directories(config)
    
    # Create each directory
    created_count = 0
    existing_count = 0
    
    for dir_path in required_dirs:
        if not dir_path.exists():
            try:
                dir_path.mkdir(parents=True, exist_ok=True)
                logger.debug(f"   ✅ Created: {dir_path}")
                created_count += 1
            except Exception as e:
                logger.error(f"   ❌ Failed to create {dir_path}: {e}")
        else:
            existing_count += 1
    
    logger.info(
        f"✅ Directory initialization complete: {created_count} created, {existing_count} already existed"
    )


def _get_required_directories(config: FileOrganizationConfig) -> List[Path]:
    """
    Get list of all required directories based on configuration.
    
    Args:
        config: File organization configuration
    
    Returns:
        List of Path objects for all required directories
    """
    base_dirs = []
    
    # Base directories from config
    base_dirs.extend([
        config.artifacts_base_dir,
        config.logs_base_dir,
        config.workspace_base_dir,
    ])
    
    # Artifact subdirectories
    artifacts_subdirs = [
        config.artifacts_base_dir / "comparisons",
        config.artifacts_base_dir / "comparisons" / "auto_startup",
        config.artifacts_base_dir / "comparisons" / "manual",
        config.artifacts_base_dir / "investigations",
        config.artifacts_base_dir / "reports",
        config.artifacts_base_dir / "exports",
    ]
    base_dirs.extend(artifacts_subdirs)
    
    # Logs subdirectories
    logs_subdirs = [
        config.logs_base_dir / "investigation",
        config.logs_base_dir / "journey_tracking",  # Critical: prevents FileNotFoundError
        config.logs_base_dir / "agent",
        config.logs_base_dir / "server",
    ]
    base_dirs.extend(logs_subdirs)
    
    # Workspace subdirectories
    workspace_subdirs = [
        config.workspace_base_dir / "temp",
        config.workspace_base_dir / "cache",
    ]
    base_dirs.extend(workspace_subdirs)
    
    return base_dirs


def ensure_directory_exists(path: Path) -> None:
    """
    Ensure a specific directory exists, creating it if necessary.
    
    This is a utility function that can be called before any file write operation.
    
    Args:
        path: Path to directory that should exist
    """
    if not path.exists():
        try:
            path.mkdir(parents=True, exist_ok=True)
            logger.debug(f"Created directory: {path}")
        except Exception as e:
            logger.error(f"Failed to create directory {path}: {e}")
            raise

