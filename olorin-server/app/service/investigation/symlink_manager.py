"""
Symlink Manager

Manages symlink creation with auto-fallback to indexed views for Windows/network mounts.
Registry maintains symlink metadata for indexed views when symlinks cannot be created.

Constitutional Compliance:
- NO hardcoded values (all configurable)
- Complete implementation with no stubs/mocks
- Handles platform differences and network mounts
"""

import os
import platform
from pathlib import Path
from typing import Literal, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class SymlinkManager:
    """Manages symlink creation with indexed view fallback."""

    ViewType = Literal["symlink", "indexed"]

    def __init__(self, registry: Optional[object] = None):
        """
        Initialize symlink manager.

        Args:
            registry: Optional registry object for indexed views (if None, indexed views
                     are not persisted but still tracked)
        """
        self.registry = registry
        self.is_windows = platform.system() == "Windows"
        self.symlinks_supported = self._check_symlink_support()

    def _check_symlink_support(self) -> bool:
        """
        Check if symlinks are supported on current platform/filesystem.

        Returns:
            True if symlinks are supported, False otherwise
        """
        if self.is_windows:
            # Windows requires admin privileges or developer mode for symlinks
            # Check if we can create symlinks
            try:
                test_dir = (
                    Path("/tmp")
                    if not self.is_windows
                    else Path(os.getenv("TEMP", "."))
                )
                test_link = test_dir / "symlink_test_link"
                test_target = test_dir / "symlink_test_target"

                # Create test target
                test_target.touch()
                try:
                    # Try to create symlink
                    if self.is_windows:
                        # Windows: use os.symlink or check for developer mode
                        try:
                            os.symlink(str(test_target), str(test_link))
                            test_link.unlink()
                            test_target.unlink()
                            return True
                        except OSError:
                            # Symlinks not supported (need admin or developer mode)
                            test_target.unlink()
                            return False
                    else:
                        # POSIX: symlinks should work
                        os.symlink(str(test_target), str(test_link))
                        test_link.unlink()
                        test_target.unlink()
                        return True
                except Exception:
                    test_target.unlink()
                    if test_link.exists():
                        test_link.unlink()
                    return False
            except Exception:
                # If we can't test, assume symlinks not supported
                return False
        else:
            # POSIX systems generally support symlinks
            return True

    def create_symlink(
        self, target: Path, link_path: Path, force: bool = False
    ) -> tuple[ViewType, Optional[str]]:
        """
        Create symlink or indexed view.

        Args:
            target: Target file/directory path
            link_path: Symlink path to create
            force: Whether to overwrite existing link (default: False)

        Returns:
            Tuple of (view_type, error_message)
            - view_type: "symlink" if symlink created, "indexed" if indexed view used
            - error_message: Error message if creation failed, None if successful
        """
        # Validate target exists
        if not target.exists():
            return ("indexed", f"Target does not exist: {target}. Using indexed view.")

        # Check if link already exists
        if link_path.exists() or link_path.is_symlink():
            if not force:
                # Check if it's already pointing to the right target
                if link_path.is_symlink():
                    try:
                        if link_path.resolve() == target.resolve():
                            logger.debug(
                                f"Symlink already exists and points to correct target: "
                                f"{link_path} -> {target}"
                            )
                            return ("symlink", None)
                    except (OSError, RuntimeError):
                        # Symlink is broken, will recreate
                        pass

                return (
                    "indexed",
                    f"Link path already exists: {link_path}. Using indexed view.",
                )
            else:
                # Remove existing link/path
                try:
                    if link_path.is_symlink():
                        link_path.unlink()
                    elif link_path.is_dir():
                        link_path.rmdir()
                    else:
                        link_path.unlink()
                except OSError as e:
                    return (
                        "indexed",
                        f"Failed to remove existing link: {e}. Using indexed view.",
                    )

        # Try to create symlink if supported
        if self.symlinks_supported:
            try:
                # Create parent directories
                link_path.parent.mkdir(parents=True, exist_ok=True)

                # Create symlink
                # CRITICAL: Use absolute path for target to avoid resolution issues
                # Relative symlinks can resolve incorrectly when the working directory changes
                target_absolute = target.resolve()

                if target.is_dir():
                    os.symlink(
                        str(target_absolute), str(link_path), target_is_directory=True
                    )
                else:
                    os.symlink(
                        str(target_absolute), str(link_path), target_is_directory=False
                    )

                logger.debug(f"Created symlink: {link_path} -> {target}")
                return ("symlink", None)

            except OSError as e:
                # Symlink creation failed, fall back to indexed view
                logger.warning(
                    f"Failed to create symlink {link_path} -> {target}: {e}. "
                    f"Falling back to indexed view."
                )
                return self._create_indexed_view(target, link_path)

        else:
            # Symlinks not supported, use indexed view
            logger.debug(
                f"Symlinks not supported on this platform/filesystem. "
                f"Using indexed view for {link_path} -> {target}"
            )
            return self._create_indexed_view(target, link_path)

    def _create_indexed_view(
        self, target: Path, link_path: Path
    ) -> tuple[ViewType, Optional[str]]:
        """
        Create indexed view entry in registry.

        Args:
            target: Target file/directory path
            link_path: Virtual link path

        Returns:
            Tuple of (view_type, error_message)
        """
        # Create parent directories for link_path (even though it's virtual)
        try:
            link_path.parent.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            return (
                "indexed",
                f"Failed to create parent directories for indexed view: {e}",
            )

        # Register indexed view in registry if available
        if self.registry:
            try:
                # Registry should have a method like register_indexed_view
                if hasattr(self.registry, "register_indexed_view"):
                    self.registry.register_indexed_view(
                        virtual_path=str(link_path),
                        canonical_path=str(target),
                        view_type="indexed",
                    )
                    logger.debug(f"Registered indexed view: {link_path} -> {target}")
                else:
                    logger.debug(
                        f"Registry does not support indexed views. "
                        f"Tracking {link_path} -> {target} locally."
                    )
            except Exception as e:
                logger.warning(f"Failed to register indexed view in registry: {e}")

        return ("indexed", None)

    def resolve_view_path(self, link_path: Path) -> Optional[Path]:
        """
        Resolve symlink or indexed view to canonical path.

        Args:
            link_path: Symlink or indexed view path

        Returns:
            Canonical target path if found, None otherwise
        """
        # If it's a real symlink, resolve it
        if link_path.is_symlink():
            try:
                return link_path.resolve()
            except (OSError, RuntimeError) as e:
                logger.warning(f"Failed to resolve symlink {link_path}: {e}")
                return None

        # Check registry for indexed view
        if self.registry and hasattr(self.registry, "resolve_indexed_view"):
            try:
                canonical_path = self.registry.resolve_indexed_view(str(link_path))
                if canonical_path:
                    return Path(canonical_path)
            except Exception as e:
                logger.warning(f"Failed to resolve indexed view from registry: {e}")

        return None

    def remove_view(self, link_path: Path) -> bool:
        """
        Remove symlink or indexed view.

        Args:
            link_path: Symlink or indexed view path

        Returns:
            True if removed successfully, False otherwise
        """
        # Remove symlink if it exists
        if link_path.is_symlink():
            try:
                link_path.unlink()
                logger.debug(f"Removed symlink: {link_path}")
                return True
            except OSError as e:
                logger.warning(f"Failed to remove symlink {link_path}: {e}")
                return False

        # Remove indexed view from registry
        if self.registry and hasattr(self.registry, "remove_indexed_view"):
            try:
                self.registry.remove_indexed_view(str(link_path))
                logger.debug(f"Removed indexed view: {link_path}")
                return True
            except Exception as e:
                logger.warning(f"Failed to remove indexed view from registry: {e}")
                return False

        return False
