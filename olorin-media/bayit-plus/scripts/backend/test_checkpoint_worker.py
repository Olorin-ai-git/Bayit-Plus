"""
Verification script for Beta checkpoint worker.

Tests:
1. Worker initialization
2. Worker start/stop without errors
3. Configuration loading

Run: poetry run python scripts/test_checkpoint_worker.py
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_checkpoint_worker():
    """Test checkpoint worker initialization and lifecycle."""
    try:
        # 1. Import configuration
        logger.info("Testing configuration...")
        from app.core.config import settings

        logger.info(f"✅ BETA_FEATURES_ENABLED: {settings.BETA_FEATURES_ENABLED}")
        logger.info(f"✅ SESSION_CHECKPOINT_INTERVAL_SECONDS: {settings.SESSION_CHECKPOINT_INTERVAL_SECONDS}")

        # 2. Import worker
        logger.info("\nTesting worker import...")
        from app.workers.beta_checkpoint_worker import checkpoint_worker

        logger.info(f"✅ Worker class: {checkpoint_worker.__class__.__name__}")
        logger.info(f"✅ Checkpoint interval: {checkpoint_worker.checkpoint_interval}s")
        logger.info(f"✅ Max batch size: {checkpoint_worker.max_batch_size}")

        # 3. Test start/stop (without actually processing - just lifecycle)
        logger.info("\nTesting worker start/stop...")

        # Start worker
        await checkpoint_worker.start()
        logger.info(f"✅ Worker started (running: {checkpoint_worker.running})")

        # Wait briefly
        await asyncio.sleep(2)

        # Stop worker
        await checkpoint_worker.stop()
        logger.info(f"✅ Worker stopped (running: {checkpoint_worker.running})")

        # 4. Success
        logger.info("\n" + "="*60)
        logger.info("✅ ALL TESTS PASSED - Checkpoint worker is ready!")
        logger.info("="*60)
        return 0

    except Exception as e:
        logger.error(f"\n❌ TEST FAILED: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(test_checkpoint_worker())
    sys.exit(exit_code)
