"""
Async Client Session Manager

Provides centralized management for async HTTP client sessions to prevent
unclosed session warnings and ensure proper resource cleanup.
"""

import asyncio
import weakref
from typing import Dict, Set, Optional, Any
from contextlib import asynccontextmanager

import aiohttp
from aiohttp import ClientTimeout

from app.service.logging import get_bridge_logger

# Import observability (with fallback for circular imports)
try:
    from app.service.agent.orchestration.hybrid.observability import increment_counter
except ImportError:
    # Fallback if observability not available
    def increment_counter(name: str, amount: int = 1, metadata=None):
        pass

logger = get_bridge_logger(__name__)


class AsyncClientManager:
    """
    Centralized manager for async HTTP client sessions.
    
    Features:
    - Automatic session cleanup on application shutdown
    - Weak references to prevent memory leaks
    - Session pooling and reuse
    - Debug tracking for unclosed sessions
    """
    
    def __init__(self):
        """Initialize the async client manager."""
        self._sessions: Set[aiohttp.ClientSession] = set()
        self._session_refs: Set[weakref.ReferenceType] = set()
        self._cleanup_registered = False
        
    def register_session(self, session: aiohttp.ClientSession) -> None:
        """Register a session for cleanup tracking."""
        self._sessions.add(session)
        
        # Add weak reference for debugging
        def cleanup_ref(ref):
            self._session_refs.discard(ref)
            
        ref = weakref.ref(session, cleanup_ref)
        self._session_refs.add(ref)
        
        logger.debug(f"📡 Registered async session: {len(self._sessions)} active sessions")
    
    def unregister_session(self, session: aiohttp.ClientSession) -> None:
        """Unregister a session when manually closed."""
        self._sessions.discard(session)
        logger.debug(f"📡 Unregistered async session: {len(self._sessions)} active sessions")
    
    async def close_session(self, session: aiohttp.ClientSession) -> None:
        """Close a specific session safely."""
        if session and not session.closed:
            try:
                await session.close()
                self.unregister_session(session)
                increment_counter("async_sessions_cleaned")
                logger.debug("📡 Session closed successfully")
            except Exception as e:
                increment_counter("session_cleanup_failures")
                logger.warning(f"Failed to close session: {e}")
    
    async def cleanup_all_sessions(self) -> None:
        """Close all registered sessions."""
        if not self._sessions:
            logger.debug("📡 No active sessions to cleanup")
            return
            
        logger.info(f"📡 Cleaning up {len(self._sessions)} active HTTP sessions")
        
        # Create a copy to avoid modification during iteration
        sessions_to_close = list(self._sessions)
        self._sessions.clear()
        
        cleanup_tasks = []
        for session in sessions_to_close:
            if not session.closed:
                cleanup_tasks.append(session.close())
        
        if cleanup_tasks:
            try:
                await asyncio.gather(*cleanup_tasks, return_exceptions=True)
                logger.info(f"✅ Successfully closed {len(cleanup_tasks)} HTTP sessions")
            except Exception as e:
                logger.warning(f"❌ Error during session cleanup: {e}")
        
        # Clear weak references
        self._session_refs.clear()
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get statistics about managed sessions."""
        active_count = len([s for s in self._sessions if not s.closed])
        return {
            "total_registered": len(self._sessions),
            "active_sessions": active_count,
            "closed_sessions": len(self._sessions) - active_count,
            "weak_refs": len(self._session_refs)
        }
    
    @asynccontextmanager
    async def managed_session(
        self,
        timeout: Optional[ClientTimeout] = None,
        headers: Optional[Dict[str, str]] = None,
        **session_kwargs
    ):
        """
        Context manager for creating and managing an HTTP session.
        
        Args:
            timeout: Client timeout configuration
            headers: Default headers for the session
            **session_kwargs: Additional arguments for ClientSession
            
        Yields:
            aiohttp.ClientSession: Managed HTTP session
        """
        # Set default timeout if not provided
        if timeout is None:
            timeout = ClientTimeout(total=30)
        
        # Set default user agent if not in headers
        if headers is None:
            headers = {}
        if "User-Agent" not in headers:
            headers["User-Agent"] = "Olorin-Fraud-Detection/1.0"
        
        session = aiohttp.ClientSession(
            timeout=timeout,
            headers=headers,
            **session_kwargs
        )
        
        try:
            self.register_session(session)
            increment_counter("async_sessions_created")
            yield session
        finally:
            await self.close_session(session)


# Global instance
_client_manager: Optional[AsyncClientManager] = None


def get_client_manager() -> AsyncClientManager:
    """Get the global async client manager instance."""
    global _client_manager
    if _client_manager is None:
        _client_manager = AsyncClientManager()
        # Auto-register cleanup on first access
        if not _client_manager._cleanup_registered:
            register_cleanup_on_shutdown()
            _client_manager._cleanup_registered = True
    return _client_manager


async def cleanup_async_clients() -> None:
    """Cleanup all managed async clients - call on application shutdown."""
    manager = get_client_manager()
    await manager.cleanup_all_sessions()


@asynccontextmanager
async def http_session(
    timeout: Optional[ClientTimeout] = None,
    headers: Optional[Dict[str, str]] = None,
    **kwargs
):
    """
    Convenience context manager for HTTP sessions.
    
    Usage:
        async with http_session() as session:
            async with session.get('https://api.example.com') as response:
                data = await response.json()
    """
    manager = get_client_manager()
    async with manager.managed_session(timeout=timeout, headers=headers, **kwargs) as session:
        yield session


def register_cleanup_on_shutdown():
    """Register cleanup handler for application shutdown."""
    import atexit
    import signal

    def sync_cleanup():
        try:
            # Force cleanup all sessions immediately
            loop = None
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                pass

            if loop and loop.is_running():
                # Schedule cleanup task if loop is running
<<<<<<< HEAD
                task = loop.create_task(cleanup_async_clients())
                # Give it a moment to complete
                try:
                    loop.run_until_complete(asyncio.wait_for(task, timeout=2.0))
                except (asyncio.TimeoutError, RuntimeError):
                    logger.warning("📡 Cleanup task timed out or failed")
=======
                # Cannot use run_until_complete() when loop is already running
                # Just schedule the task and let it run in the background
                task = loop.create_task(cleanup_async_clients())
                # Add a callback to log if it fails
                def log_cleanup_result(task):
                    try:
                        if task.exception():
                            logger.warning(f"📡 Cleanup task failed: {task.exception()}")
                    except Exception:
                        pass
                task.add_done_callback(log_cleanup_result)
>>>>>>> 001-modify-analyzer-method
            else:
                # Run cleanup if loop is not running
                try:
                    asyncio.run(cleanup_async_clients())
                except RuntimeError as e:
                    logger.warning(f"📡 Direct cleanup failed: {e}")
        except Exception as e:
            logger.warning(f"📡 Cleanup registration failed: {e}")

    # Register for both normal exit and signal termination
    atexit.register(sync_cleanup)

    # Also handle SIGTERM and SIGINT
    for sig in [signal.SIGTERM, signal.SIGINT]:
        try:
            signal.signal(sig, lambda signum, frame: sync_cleanup())
        except (OSError, ValueError):
            # Some signals may not be available on all platforms
            pass

    logger.debug("📡 Registered async client cleanup on application shutdown")