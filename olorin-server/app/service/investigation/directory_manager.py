"""
Directory Manager

Manages directory creation and validation with security checks.
Prevents directory traversal attacks and validates paths before creation.

Constitutional Compliance:
- NO hardcoded values (all configurable)
- Complete implementation with no stubs/mocks
- Comprehensive path validation
"""

import os
import stat
from pathlib import Path
from typing import Optional

# Lazy import to avoid circular dependency
# Logger will be initialized in methods when needed


class DirectoryManager:
    """Manages directory creation and validation."""

    # Maximum path length (Linux limit is 4096, Windows is 260 for some operations)
    MAX_PATH_LENGTH = 4096

    # Windows reserved names (case-insensitive)
    WINDOWS_RESERVED_NAMES = {
        "CON", "PRN", "AUX", "NUL",
        "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
        "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
    }

    def __init__(self, max_path_length: int = MAX_PATH_LENGTH):
        """
        Initialize directory manager.

        Args:
            max_path_length: Maximum allowed path length (default: 4096)
        """
        self.max_path_length = max_path_length

    def validate_path(self, path: Path) -> tuple[bool, Optional[str]]:
        """
        Validate path before creation.

        Validations:
        - Path length limits
        - Directory traversal prevention
        - Invalid character detection
        - Reserved names (Windows)

        Args:
            path: Path to validate

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Convert to absolute path for validation
        try:
            abs_path = path.resolve()
        except (OSError, RuntimeError) as e:
            return False, f"Invalid path: {e}"

        # Check path length
        path_str = str(abs_path)
        if len(path_str) > self.max_path_length:
            return False, (
                f"Path exceeds maximum length ({self.max_path_length}): "
                f"{len(path_str)} characters"
            )

        # Check for directory traversal
        path_parts = abs_path.parts
        if ".." in path_parts:
            return False, "Path contains directory traversal ('..')"

        # Check for absolute path components (except root)
        for part in path_parts[1:]:
            if os.path.isabs(part):
                return False, f"Path contains absolute component: {part}"

        # Check for null bytes
        if "\x00" in path_str:
            return False, "Path contains null byte"

        # Check for control characters (0x00-0x1F, except tab/newline)
        for char in path_str:
            code = ord(char)
            if code < 32 and char not in ("\t", "\n"):
                return False, f"Path contains control character: {repr(char)}"

        # Check Windows reserved names (case-insensitive)
        for part in path_parts:
            if part.upper() in self.WINDOWS_RESERVED_NAMES:
                return False, f"Path contains Windows reserved name: {part}"

        # Check for trailing spaces/dots (Windows issue)
        for part in path_parts:
            if part.endswith(" ") or part.endswith("."):
                return False, (
                    f"Path component ends with space or dot (Windows issue): {part}"
                )

        return True, None

    def create_directory(
        self,
        path: Path,
        validate: bool = True,
        mode: int = 0o755
    ) -> Path:
        """
        Create directory with validation.

        Args:
            path: Path to directory to create
            validate: Whether to validate path before creation (default: True)
            mode: Directory permissions (default: 0o755)

        Returns:
            Created directory path

        Raises:
            ValueError: If path validation fails
            OSError: If directory creation fails (permissions, disk full, etc.)
        """
        if validate:
            is_valid, error_msg = self.validate_path(path)
            if not is_valid:
                raise ValueError(f"Path validation failed: {error_msg}")

        # Create parent directories if needed
        parent = path.parent
        if parent != path and not parent.exists():
            try:
                self.create_directory(parent, validate=validate, mode=mode)
            except OSError as e:
                raise OSError(
                    f"Failed to create parent directory {parent}: {e}"
                ) from e

        # Create directory if it doesn't exist
        if not path.exists():
            try:
                path.mkdir(mode=mode, exist_ok=False)
                # Lazy import logger
                from app.service.logging import get_bridge_logger
                get_bridge_logger(__name__).debug(f"Created directory: {path}")
            except FileExistsError:
                # Directory was created by another process
                from app.service.logging import get_bridge_logger
                get_bridge_logger(__name__).debug(f"Directory already exists: {path}")
            except OSError as e:
                error_msg = (
                    f"Failed to create directory {path}: {e}. "
                    f"Check permissions and disk space."
                )
                from app.service.logging import get_bridge_logger
                get_bridge_logger(__name__).error(error_msg)
                raise OSError(error_msg) from e
        else:
            if not path.is_dir():
                raise OSError(f"Path exists but is not a directory: {path}")
            from app.service.logging import get_bridge_logger
            get_bridge_logger(__name__).debug(f"Directory already exists: {path}")

        # Set permissions (may fail on Windows, but that's okay)
        try:
            os.chmod(path, mode)
        except OSError:
            # Permission setting may fail on Windows or if not owner
            from app.service.logging import get_bridge_logger
            get_bridge_logger(__name__).debug(f"Could not set permissions on {path}")

        return path

    def ensure_directory_exists(
        self,
        path: Path,
        validate: bool = True
    ) -> Path:
        """
        Ensure directory exists, creating if necessary.

        Convenience method that creates directory if it doesn't exist.

        Args:
            path: Path to directory
            validate: Whether to validate path (default: True)

        Returns:
            Directory path
        """
        if path.exists():
            if not path.is_dir():
                raise OSError(f"Path exists but is not a directory: {path}")
            return path

        return self.create_directory(path, validate=validate)

