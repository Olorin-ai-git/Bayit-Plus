"""
MongoDB transaction helpers with retry logic.

Provides utilities for executing operations with transient error handling
and exponential backoff retry strategy.
"""
import asyncio
from typing import Callable, TypeVar, Any

import pymongo.errors
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_database

T = TypeVar("T")


class TransactionError(Exception):
    """Base exception for transaction errors."""

    pass


class TransactionRetryExhausted(TransactionError):
    """Raised when maximum retry attempts are exhausted."""

    pass


async def with_retry(
    operation: Callable[..., T],
    max_retries: int = 3,
    initial_delay: float = 0.5,
    max_delay: float = 30.0,
    operation_name: str = "operation",
) -> T:
    """
    Execute operation with exponential backoff retry for transient errors.

    Automatically retries operations that fail with transient MongoDB errors
    (e.g., write conflicts, temporary network issues).

    Args:
        operation: Async callable to execute
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds before first retry
        max_delay: Maximum delay in seconds between retries
        operation_name: Name for logging purposes

    Returns:
        Result from successful operation execution

    Raises:
        TransactionRetryExhausted: If max retries exceeded
        Exception: If operation fails with non-transient error

    Example:
        result = await with_retry(
            lambda: my_migration_function(),
            max_retries=3,
            operation_name="URL migration"
        )
    """
    retry_count = 0
    last_error = None

    while retry_count <= max_retries:
        try:
            return await operation()

        except pymongo.errors.OperationFailure as e:
            # Check if error is transient (can be retried)
            if e.has_error_label("TransientTransactionError"):
                retry_count += 1
                if retry_count > max_retries:
                    raise TransactionRetryExhausted(
                        f"{operation_name} failed after {max_retries} retries: {e}"
                    ) from e

                # Calculate exponential backoff delay
                delay = min(initial_delay * (2 ** (retry_count - 1)), max_delay)

                print(
                    f"⚠️  Transient error in {operation_name}, "
                    f"retrying in {delay:.1f}s (attempt {retry_count}/{max_retries})..."
                )

                await asyncio.sleep(delay)
                last_error = e
                continue

            # Non-transient error - don't retry
            raise

        except Exception as e:
            # Other exceptions - don't retry
            raise

    # Should not reach here, but just in case
    raise TransactionRetryExhausted(
        f"{operation_name} failed after {max_retries} retries"
    ) from last_error


async def execute_in_transaction(
    operation: Callable[[Any], T], max_retries: int = 3, operation_name: str = "transaction"
) -> T:
    """
    Execute operation within a MongoDB transaction with retry logic.

    Handles session management and transaction lifecycle automatically.
    Retries on transient errors with exponential backoff.

    Args:
        operation: Async callable that takes session parameter
        max_retries: Maximum number of retry attempts
        operation_name: Name for logging purposes

    Returns:
        Result from successful operation execution

    Example:
        async def my_migration(session):
            # ... perform operations with session
            return result

        result = await execute_in_transaction(my_migration)
    """

    async def _execute_with_session():
        db = await get_database()

        async with await db.client.start_session() as session:
            async with session.start_transaction():
                result = await operation(session)
                return result

    return await with_retry(
        _execute_with_session, max_retries=max_retries, operation_name=operation_name
    )


async def verify_transaction_support() -> bool:
    """
    Verify that MongoDB deployment supports transactions.

    Transactions require MongoDB replica set or sharded cluster.
    Standalone MongoDB instances do not support transactions.

    Returns:
        True if transactions are supported, False otherwise
    """
    try:
        db = await get_database()
        server_info = await db.client.server_info()

        # Check if running in replica set or sharded cluster
        if "setName" in server_info or server_info.get("msg") == "isdbgrid":
            return True

        return False

    except Exception:
        return False


async def get_transaction_info() -> dict:
    """
    Get information about transaction support and MongoDB configuration.

    Returns:
        Dictionary with transaction support information
    """
    try:
        db = await get_database()
        server_info = await db.client.server_info()

        is_replica_set = "setName" in server_info
        is_sharded = server_info.get("msg") == "isdbgrid"
        version = server_info.get("version", "unknown")

        return {
            "version": version,
            "is_replica_set": is_replica_set,
            "is_sharded": is_sharded,
            "transactions_supported": is_replica_set or is_sharded,
            "set_name": server_info.get("setName"),
        }

    except Exception as e:
        return {
            "error": str(e),
            "transactions_supported": False,
        }
