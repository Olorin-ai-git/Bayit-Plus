"""File system tools for LangGraph agents to interact with files and directories."""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class _FileReadArgs(BaseModel):
    """Arguments for the file read tool."""

    file_path: str = Field(..., description="Path to the file to read")
    encoding: str = Field(default="utf-8", description="File encoding (default: utf-8)")
    max_size: int = Field(
        default=1048576, description="Maximum file size to read in bytes"  # 1MB
    )


class FileReadTool(BaseTool):
    """
    LangChain tool for reading file contents.

    Supports various encodings and has safety features like size limits.
    """

    name: str = "file_read"
    description: str = (
        "Read the contents of a file. "
        "Supports various text encodings and has safety limits. "
        "Returns the file content as text."
    )
    args_schema: type[BaseModel] = _FileReadArgs

    def __init__(self, base_path: Optional[str] = None, **kwargs):
        """Initialize with optional base path for security."""
        super().__init__(**kwargs)
        self._base_path = Path(base_path) if base_path else None

    def _validate_path(self, file_path: str) -> Path:
        """Validate and resolve file path."""
        path = Path(file_path)

        # Convert to absolute path
        if not path.is_absolute():
            if self._base_path:
                path = self._base_path / path
            else:
                path = Path.cwd() / path

        # Security check: ensure path is within base_path if specified
        if self._base_path:
            try:
                path.resolve().relative_to(self._base_path.resolve())
            except ValueError:
                raise PermissionError(f"Access denied: path outside allowed directory")

        return path

    def _run(
        self, file_path: str, encoding: str = "utf-8", max_size: int = 1048576
    ) -> Dict[str, Any]:
        """Read the file."""
        try:
            path = self._validate_path(file_path)

            # Check if file exists
            if not path.exists():
                return {
                    "success": False,
                    "error": f"File not found: {file_path}",
                    "file_path": str(path),
                }

            # Check if it's a file
            if not path.is_file():
                return {
                    "success": False,
                    "error": f"Path is not a file: {file_path}",
                    "file_path": str(path),
                }

            # Check file size
            file_size = path.stat().st_size
            if file_size > max_size:
                return {
                    "success": False,
                    "error": f"File too large: {file_size} bytes (max: {max_size})",
                    "file_path": str(path),
                    "file_size": file_size,
                }

            # Read file
            with open(path, "r", encoding=encoding) as f:
                content = f.read()

            return {
                "success": True,
                "file_path": str(path),
                "content": content,
                "file_size": file_size,
                "encoding": encoding,
            }

        except PermissionError as e:
            logger.error(f"Permission error reading file: {e}")
            return {"success": False, "error": str(e), "file_path": file_path}
        except UnicodeDecodeError as e:
            logger.error(f"Encoding error reading file: {e}")
            return {
                "success": False,
                "error": f"Encoding error: {str(e)}. Try a different encoding.",
                "file_path": file_path,
            }
        except Exception as e:
            logger.error(f"Error reading file: {e}")
            return {"success": False, "error": str(e), "file_path": file_path}

    async def _arun(
        self, file_path: str, encoding: str = "utf-8", max_size: int = 1048576
    ) -> Dict[str, Any]:
        """Async version of file reading."""
        return self._run(file_path, encoding, max_size)


class _FileWriteArgs(BaseModel):
    """Arguments for the file write tool."""

    file_path: str = Field(..., description="Path to the file to write")
    content: str = Field(..., description="Content to write to the file")
    encoding: str = Field(default="utf-8", description="File encoding (default: utf-8)")
    append: bool = Field(
        default=False,
        description="Whether to append to the file instead of overwriting",
    )
    create_dirs: bool = Field(
        default=True,
        description="Whether to create parent directories if they don't exist",
    )


class FileWriteTool(BaseTool):
    """
    LangChain tool for writing content to files.

    Can create new files or append to existing ones.
    """

    name: str = "file_write"
    description: str = (
        "Write content to a file. "
        "Can create new files, overwrite existing ones, or append content. "
        "Supports creating parent directories automatically."
    )
    args_schema: type[BaseModel] = _FileWriteArgs

    def __init__(self, base_path: Optional[str] = None, **kwargs):
        """Initialize with optional base path for security."""
        super().__init__(**kwargs)
        self._base_path = Path(base_path) if base_path else None

    def _validate_path(self, file_path: str) -> Path:
        """Validate and resolve file path."""
        path = Path(file_path)

        # Convert to absolute path
        if not path.is_absolute():
            if self._base_path:
                path = self._base_path / path
            else:
                path = Path.cwd() / path

        # Security check: ensure path is within base_path if specified
        if self._base_path:
            try:
                path.resolve().relative_to(self._base_path.resolve())
            except ValueError:
                raise PermissionError(f"Access denied: path outside allowed directory")

        return path

    def _run(
        self,
        file_path: str,
        content: str,
        encoding: str = "utf-8",
        append: bool = False,
        create_dirs: bool = True,
    ) -> Dict[str, Any]:
        """Write to the file."""
        try:
            path = self._validate_path(file_path)

            # Create parent directories if needed
            if create_dirs:
                path.parent.mkdir(parents=True, exist_ok=True)

            # Write file
            mode = "a" if append else "w"
            with open(path, mode, encoding=encoding) as f:
                f.write(content)

            # Get file info
            file_size = path.stat().st_size

            return {
                "success": True,
                "file_path": str(path),
                "bytes_written": len(content.encode(encoding)),
                "file_size": file_size,
                "mode": "append" if append else "write",
                "encoding": encoding,
            }

        except PermissionError as e:
            logger.error(f"Permission error writing file: {e}")
            return {"success": False, "error": str(e), "file_path": file_path}
        except Exception as e:
            logger.error(f"Error writing file: {e}")
            return {"success": False, "error": str(e), "file_path": file_path}

    async def _arun(
        self,
        file_path: str,
        content: str,
        encoding: str = "utf-8",
        append: bool = False,
        create_dirs: bool = True,
    ) -> Dict[str, Any]:
        """Async version of file writing."""
        return self._run(file_path, content, encoding, append, create_dirs)


class _DirectoryListArgs(BaseModel):
    """Arguments for the directory list tool."""

    directory_path: str = Field(
        default=".", description="Path to the directory to list"
    )
    recursive: bool = Field(
        default=False, description="Whether to list files recursively"
    )
    include_hidden: bool = Field(
        default=False, description="Whether to include hidden files (starting with .)"
    )
    pattern: Optional[str] = Field(
        default=None, description="Glob pattern to filter files (e.g., '*.py', '*.txt')"
    )
    max_depth: int = Field(
        default=3, description="Maximum recursion depth (only used if recursive=True)"
    )


class DirectoryListTool(BaseTool):
    """
    LangChain tool for listing directory contents.

    Can list files and directories with various filtering options.
    """

    name: str = "directory_list"
    description: str = (
        "List the contents of a directory. "
        "Can list files recursively, filter by patterns, and include file metadata. "
        "Useful for exploring file system structure."
    )
    args_schema: type[BaseModel] = _DirectoryListArgs

    def __init__(self, base_path: Optional[str] = None, **kwargs):
        """Initialize with optional base path for security."""
        super().__init__(**kwargs)
        self._base_path = Path(base_path) if base_path else None

    def _validate_path(self, directory_path: str) -> Path:
        """Validate and resolve directory path."""
        path = Path(directory_path)

        # Convert to absolute path
        if not path.is_absolute():
            if self._base_path:
                path = self._base_path / path
            else:
                path = Path.cwd() / path

        # Security check: ensure path is within base_path if specified
        if self._base_path:
            try:
                path.resolve().relative_to(self._base_path.resolve())
            except ValueError:
                raise PermissionError(f"Access denied: path outside allowed directory")

        return path

    def _list_directory(
        self,
        path: Path,
        recursive: bool = False,
        include_hidden: bool = False,
        pattern: Optional[str] = None,
        max_depth: int = 3,
        current_depth: int = 0,
    ) -> List[Dict[str, Any]]:
        """List directory contents."""
        items = []

        try:
            # Get items based on pattern
            if pattern:
                if recursive and current_depth < max_depth:
                    items_iter = path.rglob(pattern)
                else:
                    items_iter = path.glob(pattern)
            else:
                items_iter = path.iterdir()

            for item in items_iter:
                # Skip hidden files if not requested
                if not include_hidden and item.name.startswith("."):
                    continue

                try:
                    stat = item.stat()
                    item_info = {
                        "name": item.name,
                        "path": str(item),
                        "type": "directory" if item.is_dir() else "file",
                        "size": stat.st_size if item.is_file() else None,
                        "modified": stat.st_mtime,
                        "permissions": oct(stat.st_mode)[-3:],
                    }

                    # Add file extension for files
                    if item.is_file():
                        item_info["extension"] = item.suffix

                    items.append(item_info)

                    # Recursive listing for directories
                    if (
                        recursive
                        and item.is_dir()
                        and current_depth < max_depth
                        and not pattern
                    ):
                        sub_items = self._list_directory(
                            item,
                            recursive,
                            include_hidden,
                            pattern,
                            max_depth,
                            current_depth + 1,
                        )
                        items.extend(sub_items)

                except (PermissionError, OSError):
                    # Skip items we can't access
                    continue

        except (PermissionError, OSError) as e:
            logger.warning(f"Cannot access directory {path}: {e}")

        return items

    def _run(
        self,
        directory_path: str = ".",
        recursive: bool = False,
        include_hidden: bool = False,
        pattern: Optional[str] = None,
        max_depth: int = 3,
    ) -> Dict[str, Any]:
        """List the directory."""
        try:
            path = self._validate_path(directory_path)

            # Check if directory exists
            if not path.exists():
                return {
                    "success": False,
                    "error": f"Directory not found: {directory_path}",
                    "directory_path": str(path),
                }

            # Check if it's a directory
            if not path.is_dir():
                return {
                    "success": False,
                    "error": f"Path is not a directory: {directory_path}",
                    "directory_path": str(path),
                }

            # List contents
            items = self._list_directory(
                path, recursive, include_hidden, pattern, max_depth
            )

            # Sort items by name
            items.sort(key=lambda x: (x["type"] != "directory", x["name"]))

            return {
                "success": True,
                "directory_path": str(path),
                "items": items,
                "total_items": len(items),
                "filters": {
                    "recursive": recursive,
                    "include_hidden": include_hidden,
                    "pattern": pattern,
                    "max_depth": max_depth if recursive else None,
                },
            }

        except PermissionError as e:
            logger.error(f"Permission error listing directory: {e}")
            return {"success": False, "error": str(e), "directory_path": directory_path}
        except Exception as e:
            logger.error(f"Error listing directory: {e}")
            return {"success": False, "error": str(e), "directory_path": directory_path}

    async def _arun(
        self,
        directory_path: str = ".",
        recursive: bool = False,
        include_hidden: bool = False,
        pattern: Optional[str] = None,
        max_depth: int = 3,
    ) -> Dict[str, Any]:
        """Async version of directory listing."""
        return self._run(directory_path, recursive, include_hidden, pattern, max_depth)


class _FileSearchArgs(BaseModel):
    """Arguments for the file search tool."""

    search_term: str = Field(..., description="Text to search for within files")
    directory_path: str = Field(default=".", description="Directory to search in")
    file_pattern: str = Field(
        default="*", description="File pattern to match (e.g., '*.py', '*.txt')"
    )
    case_sensitive: bool = Field(
        default=False, description="Whether the search should be case sensitive"
    )
    max_results: int = Field(
        default=100, description="Maximum number of results to return"
    )
    context_lines: int = Field(
        default=2, description="Number of context lines to show around matches"
    )


class FileSearchTool(BaseTool):
    """
    LangChain tool for searching text within files.

    Can search for text patterns across multiple files with context.
    """

    name: str = "file_search"
    description: str = (
        "Search for text within files in a directory. "
        "Returns matching lines with context and file locations. "
        "Supports file pattern filtering and case sensitivity options."
    )
    args_schema: type[BaseModel] = _FileSearchArgs

    def __init__(self, base_path: Optional[str] = None, **kwargs):
        """Initialize with optional base path for security."""
        super().__init__(**kwargs)
        self._base_path = Path(base_path) if base_path else None

    def _validate_path(self, directory_path: str) -> Path:
        """Validate and resolve directory path."""
        path = Path(directory_path)

        # Convert to absolute path
        if not path.is_absolute():
            if self._base_path:
                path = self._base_path / path
            else:
                path = Path.cwd() / path

        # Security check: ensure path is within base_path if specified
        if self._base_path:
            try:
                path.resolve().relative_to(self._base_path.resolve())
            except ValueError:
                raise PermissionError(f"Access denied: path outside allowed directory")

        return path

    def _search_in_file(
        self,
        file_path: Path,
        search_term: str,
        case_sensitive: bool = False,
        context_lines: int = 2,
    ) -> List[Dict[str, Any]]:
        """Search for term in a single file."""
        matches = []

        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()

            search_term_check = search_term if case_sensitive else search_term.lower()

            for i, line in enumerate(lines):
                line_check = line if case_sensitive else line.lower()

                if search_term_check in line_check:
                    # Get context lines
                    start_line = max(0, i - context_lines)
                    end_line = min(len(lines), i + context_lines + 1)

                    context = []
                    for j in range(start_line, end_line):
                        context.append(
                            {
                                "line_number": j + 1,
                                "content": lines[j].rstrip(),
                                "is_match": j == i,
                            }
                        )

                    matches.append(
                        {
                            "line_number": i + 1,
                            "line_content": line.rstrip(),
                            "context": context,
                        }
                    )

        except Exception as e:
            logger.warning(f"Error searching in file {file_path}: {e}")

        return matches

    def _run(
        self,
        search_term: str,
        directory_path: str = ".",
        file_pattern: str = "*",
        case_sensitive: bool = False,
        max_results: int = 100,
        context_lines: int = 2,
    ) -> Dict[str, Any]:
        """Search for text in files."""
        try:
            path = self._validate_path(directory_path)

            # Check if directory exists
            if not path.exists():
                return {
                    "success": False,
                    "error": f"Directory not found: {directory_path}",
                    "directory_path": str(path),
                }

            # Check if it's a directory
            if not path.is_dir():
                return {
                    "success": False,
                    "error": f"Path is not a directory: {directory_path}",
                    "directory_path": str(path),
                }

            # Find matching files
            files = list(path.rglob(file_pattern))
            text_files = [f for f in files if f.is_file()]

            # Search in files
            all_matches = []
            files_searched = 0

            for file_path in text_files:
                if len(all_matches) >= max_results:
                    break

                matches = self._search_in_file(
                    file_path, search_term, case_sensitive, context_lines
                )

                if matches:
                    all_matches.append(
                        {
                            "file_path": str(file_path),
                            "relative_path": str(file_path.relative_to(path)),
                            "matches": matches,
                            "match_count": len(matches),
                        }
                    )

                files_searched += 1

            # Limit results
            if len(all_matches) > max_results:
                all_matches = all_matches[:max_results]

            total_matches = sum(item["match_count"] for item in all_matches)

            return {
                "success": True,
                "search_term": search_term,
                "directory_path": str(path),
                "file_pattern": file_pattern,
                "case_sensitive": case_sensitive,
                "files_searched": files_searched,
                "files_with_matches": len(all_matches),
                "total_matches": total_matches,
                "results": all_matches,
            }

        except PermissionError as e:
            logger.error(f"Permission error searching files: {e}")
            return {"success": False, "error": str(e), "directory_path": directory_path}
        except Exception as e:
            logger.error(f"Error searching files: {e}")
            return {"success": False, "error": str(e), "directory_path": directory_path}

    async def _arun(
        self,
        search_term: str,
        directory_path: str = ".",
        file_pattern: str = "*",
        case_sensitive: bool = False,
        max_results: int = 100,
        context_lines: int = 2,
    ) -> Dict[str, Any]:
        """Async version of file searching."""
        return self._run(
            search_term,
            directory_path,
            file_pattern,
            case_sensitive,
            max_results,
            context_lines,
        )
