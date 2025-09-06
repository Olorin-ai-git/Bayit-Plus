#!/usr/bin/env python3
"""
Deployment Persistence Layer for Olorin Platform.

Handles file-based persistence of deployment state and metadata.
Separated from state manager to maintain modularity.
"""

import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pathlib import Path
from dataclasses import asdict

logger = logging.getLogger(__name__)


class DeploymentPersistence:
    """
    Handles persistence of deployment state to disk.
    
    Provides async file operations for storing and retrieving
    deployment state data with proper error handling.
    """
    
    def __init__(self, state_dir: str = "/tmp/olorin_deployments"):
        self.state_dir = Path(state_dir)
        self.state_dir.mkdir(parents=True, exist_ok=True)
    
    async def persist_deployment_state(self, deployment_id: str, deployment_state: Any):
        """
        Persist deployment state to disk.
        
        Args:
            deployment_id: Unique identifier for the deployment
            deployment_state: Deployment state object to persist
        """
        try:
            state_file = self.state_dir / f"{deployment_id}.json"
            
            # Convert dataclass to dict if needed
            if hasattr(deployment_state, '__dataclass_fields__'):
                state_data = asdict(deployment_state)
            else:
                state_data = deployment_state
            
            # Write to temporary file first, then rename for atomic operation
            temp_file = self.state_dir / f"{deployment_id}.json.tmp"
            
            with open(temp_file, 'w') as f:
                json.dump(state_data, f, indent=2, default=str)
            
            # Atomic rename
            temp_file.rename(state_file)
            
        except Exception as e:
            logger.error(f"Failed to persist deployment state for {deployment_id}: {e}")
            raise
    
    async def load_deployment_state(self, deployment_id: str) -> Optional[Dict[str, Any]]:
        """
        Load deployment state from disk.
        
        Args:
            deployment_id: Unique identifier for the deployment
            
        Returns:
            Deployment state dictionary or None if not found
        """
        try:
            state_file = self.state_dir / f"{deployment_id}.json"
            
            if not state_file.exists():
                return None
            
            with open(state_file, 'r') as f:
                state_data = json.load(f)
            
            return state_data
            
        except Exception as e:
            logger.error(f"Failed to load deployment state for {deployment_id}: {e}")
            return None
    
    async def load_all_deployment_states(self) -> Dict[str, Dict[str, Any]]:
        """
        Load all deployment states from disk.
        
        Returns:
            Dictionary mapping deployment IDs to state data
        """
        deployments = {}
        
        try:
            for state_file in self.state_dir.glob("*.json"):
                # Skip temporary files
                if state_file.name.endswith('.tmp'):
                    continue
                
                deployment_id = state_file.stem
                state_data = await self.load_deployment_state(deployment_id)
                
                if state_data:
                    deployments[deployment_id] = state_data
            
            logger.info(f"Loaded {len(deployments)} deployment states from disk")
            
        except Exception as e:
            logger.error(f"Failed to load deployment states: {e}")
        
        return deployments
    
    async def delete_deployment_state(self, deployment_id: str):
        """
        Delete deployment state from disk.
        
        Args:
            deployment_id: Unique identifier for the deployment
        """
        try:
            state_file = self.state_dir / f"{deployment_id}.json"
            
            if state_file.exists():
                state_file.unlink()
                logger.info(f"Deleted deployment state for {deployment_id}")
        
        except Exception as e:
            logger.error(f"Failed to delete deployment state for {deployment_id}: {e}")
    
    async def cleanup_old_states(self, max_age_days: int = 30):
        """
        Clean up old deployment state files.
        
        Args:
            max_age_days: Maximum age of state files to keep
        """
        try:
            cutoff_time = datetime.now().timestamp() - (max_age_days * 24 * 60 * 60)
            deleted_count = 0
            
            for state_file in self.state_dir.glob("*.json"):
                if state_file.stat().st_mtime < cutoff_time:
                    state_file.unlink()
                    deleted_count += 1
            
            logger.info(f"Cleaned up {deleted_count} old deployment state files")
            
        except Exception as e:
            logger.error(f"Failed to cleanup old deployment states: {e}")
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """
        Get storage statistics for deployment states.
        
        Returns:
            Dictionary with storage statistics
        """
        try:
            state_files = list(self.state_dir.glob("*.json"))
            total_size = sum(f.stat().st_size for f in state_files)
            
            return {
                "state_directory": str(self.state_dir),
                "total_files": len(state_files),
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / 1024 / 1024, 2)
            }
        
        except Exception as e:
            logger.error(f"Failed to get storage stats: {e}")
            return {"error": str(e)}