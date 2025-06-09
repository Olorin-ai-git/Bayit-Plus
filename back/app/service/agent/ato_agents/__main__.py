import asyncio
import sys
from pathlib import Path

from ato_agents.log_monitor.monitor import LogMonitor
from ato_agents.utils.logging import get_logger, setup_logging

logger = get_logger(__name__)


async def main():
    """Main entry point for the fraud detection system."""
    try:
        # Set up logging
        setup_logging()
        logger.info("Starting fraud detection system...")

        # Start log monitoring
        monitor = LogMonitor(
            log_dir="logs",
            metrics_file="metrics/metrics.json",
            max_log_size=10 * 1024 * 1024,  # 10MB
            backup_count=5,
            metrics_retention_days=30,
            metrics_backup_count=3,
            max_total_log_size=500 * 1024 * 1024,  # 500MB
            high_risk_threshold=0.8,
            alert_threshold=10,
        )
        await monitor.start()
        logger.info("Log monitoring started")

        # Add your main application logic here

        logger.info("Fraud detection system started successfully")

        # Keep the application running
        while True:
            await asyncio.sleep(3600)  # Sleep for an hour

    except KeyboardInterrupt:
        logger.info("Shutting down fraud detection system...")
    except Exception as e:
        logger.error("Error in fraud detection system", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    # Create necessary directories
    Path("logs").mkdir(exist_ok=True)

    # Run the main function
    asyncio.run(main())
