"""
Folder Monitor Service
Monitors local folders for new content and automatically enqueues uploads.
"""

import os
import asyncio
import json
import hashlib
from pathlib import Path
from typing import List, Set, Dict, Optional
from datetime import datetime
import logging
import fnmatch

from app.models.upload import MonitoredFolder, ContentType, UploadJob, UploadStatus
from app.services.upload_service import upload_service
from app.core.config import settings

logger = logging.getLogger(__name__)


class FolderMonitorService:
    """
    Monitors configured folders for new content files.
    Scans periodically and enqueues new files for upload.
    """

    def __init__(self):
        self._scanning = False
        self._known_files: Dict[str, Set[str]] = {}  # folder_id -> set of file paths
        self._hash_cache: Dict[str, Dict[str, any]] = {}  # file_path -> {hash, mtime, size}
        # Store hash cache in /tmp or current directory
        cache_base = Path("/tmp") if Path("/tmp").exists() else Path.cwd()
        self._cache_dir = cache_base / ".bayit_hash_cache"
        self._cache_dir.mkdir(exist_ok=True)
    
    def clear_known_files_cache(self, folder_id: Optional[str] = None):
        """
        Clear the in-memory known files cache.
        Useful when you want to rescan files that were previously detected.
        
        Args:
            folder_id: Optional folder ID to clear. If None, clears all.
        """
        if folder_id:
            if folder_id in self._known_files:
                count = len(self._known_files[folder_id])
                self._known_files[folder_id].clear()
                logger.info(f"✅ Cleared known files cache for folder {folder_id} ({count} files)")
            else:
                logger.warning(f"No known files cache found for folder {folder_id}")
        else:
            total_count = sum(len(files) for files in self._known_files.values())
            self._known_files.clear()
            logger.info(f"✅ Cleared all known files caches ({total_count} files)")
    
    def get_known_files_count(self, folder_id: Optional[str] = None) -> int:
        """Get count of known files for a folder or all folders"""
        if folder_id:
            return len(self._known_files.get(folder_id, set()))
        return sum(len(files) for files in self._known_files.values())
    
    def _get_cache_file(self, folder_id: str) -> Path:
        """Get cache file path for a monitored folder"""
        return self._cache_dir / f"{folder_id}.json"
    
    def _load_hash_cache(self, folder_id: str):
        """Load hash cache for a folder"""
        cache_file = self._get_cache_file(folder_id)
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load hash cache for {folder_id}: {e}")
        return {}
    
    def _save_hash_cache(self, folder_id: str, cache: Dict):
        """Save hash cache for a folder"""
        cache_file = self._get_cache_file(folder_id)
        try:
            with open(cache_file, 'w') as f:
                json.dump(cache, f)
        except Exception as e:
            logger.error(f"Failed to save hash cache for {folder_id}: {e}")
    
    async def _get_or_calculate_hash(self, file_path: str, file_stat) -> Optional[str]:
        """
        Get hash from cache or calculate if needed.
        Only recalculates if file size or mtime changed.
        """
        file_path_str = str(file_path)
        file_size = file_stat.st_size
        file_mtime = file_stat.st_mtime
        
        # Check cache
        if file_path_str in self._hash_cache:
            cached = self._hash_cache[file_path_str]
            # If size and mtime unchanged, use cached hash
            if cached.get('size') == file_size and cached.get('mtime') == file_mtime:
                logger.debug(f"Using cached hash for: {Path(file_path).name}")
                return cached.get('hash')
        
        # Calculate hash (file changed or not in cache)
        logger.info(f"Calculating hash for: {Path(file_path).name} ({file_size} bytes)")
        try:
            hash_value = await asyncio.to_thread(self._calculate_hash_sync, file_path)
            # Cache the result
            self._hash_cache[file_path_str] = {
                'hash': hash_value,
                'size': file_size,
                'mtime': file_mtime,
            }
            return hash_value
        except Exception as e:
            logger.error(f"Failed to calculate hash for {file_path}: {e}")
            return None
    
    def _calculate_hash_sync(self, file_path: str) -> str:
        """Synchronously calculate SHA256 hash"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    async def scan_and_enqueue(self) -> Dict[str, any]:
        """
        Scan all enabled monitored folders and enqueue new files.
        
        Returns:
            Statistics about the scan
        """
        if self._scanning:
            logger.info("Scan already in progress, skipping")
            return {"status": "already_running"}

        self._scanning = True
        stats = {
            "folders_scanned": 0,
            "files_found": 0,
            "files_enqueued": 0,
            "errors": 0,
        }

        try:
            # Get all enabled monitored folders
            folders = await MonitoredFolder.find(
                MonitoredFolder.enabled == True
            ).to_list()

            logger.info(f"Scanning {len(folders)} monitored folders")

            for folder in folders:
                try:
                    folder_stats = await self._scan_folder(folder)
                    stats["folders_scanned"] += 1
                    stats["files_found"] += folder_stats["files_found"]
                    stats["files_enqueued"] += folder_stats["files_enqueued"]
                    
                    # Update folder stats
                    folder.last_scanned = datetime.utcnow()
                    folder.files_found = folder_stats["files_found"]
                    folder.files_uploaded += folder_stats["files_enqueued"]
                    folder.last_error = None
                    await folder.save()
                    
                except Exception as e:
                    logger.error(f"Error scanning folder {folder.path}: {e}", exc_info=True)
                    stats["errors"] += 1
                    
                    # Update folder with error
                    folder.last_error = str(e)
                    folder.error_count += 1
                    await folder.save()

            logger.info(f"Scan complete: {stats}")
            return stats

        finally:
            self._scanning = False

    async def _scan_folder(self, folder: MonitoredFolder) -> Dict[str, int]:
        """
        Scan a single monitored folder for new files.
        
        Args:
            folder: MonitoredFolder configuration
            
        Returns:
            Statistics about files found and enqueued
        """
        stats = {
            "files_found": 0,
            "files_enqueued": 0,
        }

        folder_path = Path(folder.path)

        if not folder_path.exists():
            logger.warning(f"⚠️  Skipping folder (not found): {folder.path}")
            folder.last_error = "Folder not found"
            folder.error_count += 1
            await folder.save()
            return stats

        if not folder_path.is_dir():
            logger.warning(f"⚠️  Skipping path (not a directory): {folder.path}")
            folder.last_error = "Path is not a directory"
            folder.error_count += 1
            await folder.save()
            return stats

        logger.info(f"Scanning folder: {folder.path}")

        # Get list of known files for this folder
        folder_id = str(folder.id)
        if folder_id not in self._known_files:
            self._known_files[folder_id] = set()

        # Get file patterns for this content type
        patterns = folder.file_patterns if folder.file_patterns else self._get_default_patterns(folder.content_type)

        # Scan directory (run in executor to avoid blocking event loop on slow filesystems)
        loop = asyncio.get_event_loop()
        found_files = await loop.run_in_executor(
            None,
            self._scan_directory_sync,
            folder_path,
            patterns,
            folder.exclude_patterns,
            folder.recursive
        )

        stats["files_found"] = len(found_files)
        logger.info(f"Found {len(found_files)} files in {folder.path}")

        # Enqueue new files (with periodic yields to keep event loop responsive)
        if folder.auto_upload:
            # Load hash cache for this folder
            self._hash_cache = self._load_hash_cache(folder_id)
            
            # Get database connection for duplicate checks
            from motor.motor_asyncio import AsyncIOMotorClient
            client = AsyncIOMotorClient(settings.MONGODB_URL)
            db = client[settings.MONGODB_DB_NAME]
            
            enqueue_count = 0
            skipped_by_hash = 0
            skipped_by_queue = 0
            hash_cache_hits = 0
            hash_calculations = 0
            
            for file_path in found_files:
                # Check if file is new to this scan
                if file_path not in self._known_files[folder_id]:
                    try:
                        file_path_obj = Path(file_path)
                        filename = file_path_obj.name
                        file_stat = file_path_obj.stat()
                        file_size = file_stat.st_size
                        file_mtime = file_stat.st_mtime
                        
                        # TIER 1: Quick DB check by filename (instant, catches already-uploaded files)
                        existing_content = await db.content.find_one({
                            '$or': [
                                {'filename': filename},
                                {'stream_url': {'$regex': f'/{filename}$'}}
                            ]
                        })
                        
                        if existing_content:
                            logger.debug(f"⏭️  Skipping (already in library): {filename}")
                            skipped_by_hash += 1
                            self._known_files[folder_id].add(file_path)
                            continue
                        
                        # TIER 2: Check local cache (instant, non-blocking)
                        file_hash = None
                        file_path_str = str(file_path)
                        
                        if file_path_str in self._hash_cache:
                            cached = self._hash_cache[file_path_str]
                            # If size and mtime unchanged, use cached hash
                            if cached.get('size') == file_size and cached.get('mtime') == file_mtime:
                                file_hash = cached.get('hash')
                                hash_cache_hits += 1
                                logger.debug(f"✓ Cache hit: {filename}")
                        
                        # TIER 3: If cached hash exists, check for duplicates by hash
                        if file_hash:
                            # Check if content with this hash exists (handles renamed files)
                            existing_by_hash = await db.content.find_one({'file_hash': file_hash})
                            
                            if existing_by_hash:
                                logger.info(f"⏭️  Skipping duplicate (cached hash match): {filename} → '{existing_by_hash.get('title', 'Unknown')}'")
                                skipped_by_hash += 1
                                self._known_files[folder_id].add(file_path)
                                continue
                            
                            # Check if already queued with this hash
                            from beanie.operators import In
                            existing_job = await UploadJob.find_one(
                                UploadJob.file_hash == file_hash,
                                In(UploadJob.status, [UploadStatus.QUEUED, UploadStatus.PROCESSING, UploadStatus.UPLOADING])
                            )
                            
                            if existing_job:
                                logger.debug(f"⏭️  Skipping (already queued with cached hash): {filename}")
                                skipped_by_queue += 1
                                self._known_files[folder_id].add(file_path)
                                continue
                        
                        # TIER 3: Enqueue file (hash will be calculated in background during processing)
                        # Pass cached hash if available, otherwise will calculate during upload
                        await upload_service.enqueue_upload(
                            source_path=file_path,
                            content_type=folder.content_type,
                            metadata={
                                "source_folder": folder.path,
                                "file_size": file_size,
                                "file_mtime": file_mtime,
                                "pre_calculated_hash": file_hash,  # May be None (will calculate during processing)
                            },
                            skip_duplicate_check=True,  # We checked with cached hash, or will check during processing
                        )
                        self._known_files[folder_id].add(file_path)
                        stats["files_enqueued"] += 1
                        enqueue_count += 1
                        
                        if file_hash:
                            logger.info(f"✅ Enqueued with cached hash: {filename}")
                        else:
                            logger.info(f"✅ Enqueued (will calculate hash in background): {filename}")
                            hash_calculations += 1
                        
                        # Yield control every 5 files to keep API responsive
                        if enqueue_count % 5 == 0:
                            await asyncio.sleep(0)
                    except Exception as e:
                        logger.error(f"Failed to enqueue {file_path}: {e}")
            
            # Save updated hash cache
            self._save_hash_cache(folder_id, self._hash_cache)
            
            skipped_duplicates = skipped_by_hash + skipped_by_queue
            if skipped_duplicates > 0 or hash_cache_hits > 0:
                logger.info(f"📊 Scan stats: {hash_cache_hits} cached hashes, {hash_calculations} calculated, {skipped_duplicates} duplicates ({skipped_by_hash} in library, {skipped_by_queue} queued)")

        # Update known files list
        self._known_files[folder_id].update(found_files)

        return stats

    def _scan_directory_sync(
        self,
        folder_path: Path,
        include_patterns: List[str],
        exclude_patterns: List[str],
        recursive: bool
    ) -> List[str]:
        """
        Synchronous directory scanning (runs in executor to avoid blocking event loop).
        
        Returns:
            List of file paths that match the patterns
        """
        found_files = []
        
        if recursive:
            # Recursive scan
            for root, dirs, files in os.walk(folder_path):
                for filename in files:
                    file_path = Path(root) / filename
                    if self._should_process_file(file_path, include_patterns, exclude_patterns):
                        found_files.append(str(file_path.absolute()))
        else:
            # Non-recursive scan
            for item in folder_path.iterdir():
                if item.is_file():
                    if self._should_process_file(item, include_patterns, exclude_patterns):
                        found_files.append(str(item.absolute()))
        
        return found_files

    def _should_process_file(
        self,
        file_path: Path,
        include_patterns: List[str],
        exclude_patterns: List[str]
    ) -> bool:
        """
        Check if a file should be processed based on patterns.
        
        Args:
            file_path: Path to the file
            include_patterns: List of glob patterns to include
            exclude_patterns: List of glob patterns to exclude
            
        Returns:
            True if file should be processed
        """
        filename = file_path.name

        # Check exclude patterns first
        for pattern in exclude_patterns:
            if fnmatch.fnmatch(filename.lower(), pattern.lower()):
                return False

        # Check include patterns
        for pattern in include_patterns:
            if fnmatch.fnmatch(filename.lower(), pattern.lower()):
                return True

        return False

    def _get_default_patterns(self, content_type: ContentType) -> List[str]:
        """Get default file patterns for a content type"""
        patterns = {
            ContentType.MOVIE: ["*.mp4", "*.mkv", "*.avi", "*.mov", "*.webm", "*.m4v"],
            ContentType.SERIES: ["*.mp4", "*.mkv", "*.avi", "*.mov", "*.webm", "*.m4v"],
            ContentType.AUDIOBOOK: ["*.mp3", "*.m4a", "*.m4b", "*.wav", "*.ogg", "*.flac"],
            ContentType.PODCAST: ["*.mp3", "*.m4a", "*.wav", "*.ogg"],
            ContentType.AUDIO: ["*.mp3", "*.m4a", "*.wav", "*.ogg", "*.flac"],
            ContentType.SUBTITLE: ["*.srt", "*.vtt", "*.sub"],
        }
        
        return patterns.get(content_type, ["*.*"])

    async def scan_folder_immediately(self, folder_id: str) -> Dict[str, any]:
        """
        Trigger an immediate scan of a specific folder.
        
        Args:
            folder_id: ID of the MonitoredFolder to scan
            
        Returns:
            Scan statistics
        """
        folder = await MonitoredFolder.get(folder_id)
        
        if not folder:
            raise ValueError(f"Folder not found: {folder_id}")

        logger.info(f"Immediate scan requested for: {folder.path}")
        
        try:
            stats = await self._scan_folder(folder)
            
            # Update folder
            folder.last_scanned = datetime.utcnow()
            folder.files_found = stats["files_found"]
            folder.files_uploaded += stats["files_enqueued"]
            folder.last_error = None
            await folder.save()
            
            return {
                "status": "success",
                "folder": folder.path,
                **stats,
            }
            
        except Exception as e:
            logger.error(f"Immediate scan failed for {folder.path}: {e}", exc_info=True)
            
            # Update folder with error
            folder.last_error = str(e)
            folder.error_count += 1
            await folder.save()
            
            raise

    async def initialize_from_config(self):
        """
        Initialize monitored folders from environment configuration.
        Creates folders if they don't exist in the database.
        """
        default_folders = settings.UPLOAD_DEFAULT_FOLDERS
        
        if not default_folders:
            return

        logger.info("Initializing default monitored folders from config")

        # Parse comma-separated list
        folder_paths = [p.strip() for p in default_folders.split(",") if p.strip()]

        for path in folder_paths:
            # Check if already exists
            existing = await MonitoredFolder.find_one(MonitoredFolder.path == path)
            
            if existing:
                logger.info(f"Monitored folder already exists: {path}")
                continue

            # Try to determine content type from path
            path_lower = path.lower()
            if "movie" in path_lower:
                content_type = ContentType.MOVIE
            elif "podcast" in path_lower:
                content_type = ContentType.PODCAST
            elif "music" in path_lower or "audio" in path_lower:
                content_type = ContentType.AUDIO
            else:
                content_type = ContentType.OTHER

            # Create monitored folder
            folder = MonitoredFolder(
                path=path,
                name=Path(path).name,
                content_type=content_type,
                enabled=True,
                auto_upload=True,
                recursive=True,
            )
            
            await folder.insert()
            logger.info(f"Created monitored folder: {path} ({content_type})")

    async def get_all_monitored_folders(self) -> List[MonitoredFolder]:
        """Get all monitored folders"""
        return await MonitoredFolder.find_all().to_list()

    async def add_monitored_folder(
        self,
        path: str,
        content_type: ContentType,
        name: Optional[str] = None,
        auto_upload: bool = True,
        recursive: bool = True,
        file_patterns: Optional[List[str]] = None,
        exclude_patterns: Optional[List[str]] = None,
        scan_interval: int = 3600,
        user_id: Optional[str] = None,
    ) -> MonitoredFolder:
        """
        Add a new monitored folder.
        
        Args:
            path: Absolute path to folder
            content_type: Type of content in folder
            name: Friendly name (optional)
            auto_upload: Auto-upload new files
            recursive: Scan subdirectories
            file_patterns: File patterns to include
            exclude_patterns: File patterns to exclude
            scan_interval: Seconds between scans
            user_id: User creating the folder
            
        Returns:
            Created MonitoredFolder
        """
        folder_path = Path(path)
        
        if not folder_path.exists():
            raise FileNotFoundError(f"Folder not found: {path}")
        
        if not folder_path.is_dir():
            raise ValueError(f"Path is not a directory: {path}")

        # Check if path already exists (normalize paths for comparison)
        normalized_path = str(folder_path.resolve())
        existing = await MonitoredFolder.find_one(MonitoredFolder.path == path)
        
        # Also check normalized path in case of symlinks or relative paths
        if not existing:
            all_folders = await MonitoredFolder.find_all().to_list()
            for folder in all_folders:
                try:
                    if Path(folder.path).resolve() == Path(normalized_path):
                        existing = folder
                        break
                except Exception:
                    continue
        
        if existing:
            raise ValueError(f"This folder path is already being monitored: {path}")

        # Create folder
        folder = MonitoredFolder(
            path=str(folder_path.absolute()),
            name=name or folder_path.name,
            content_type=content_type,
            enabled=True,
            auto_upload=auto_upload,
            recursive=recursive,
            file_patterns=file_patterns or self._get_default_patterns(content_type),
            exclude_patterns=exclude_patterns or ["*.tmp", "*.part", "*.download"],
            scan_interval=scan_interval,
            created_by=user_id,
        )
        
        await folder.insert()
        logger.info(f"Added monitored folder: {path}")
        
        return folder

    async def update_monitored_folder(
        self,
        folder_id: str,
        **updates
    ) -> MonitoredFolder:
        """Update a monitored folder"""
        from bson import ObjectId
        
        # Convert string ID to ObjectId
        try:
            obj_id = ObjectId(folder_id)
        except Exception as e:
            raise ValueError(f"Invalid folder ID format: {folder_id}")
        
        folder = await MonitoredFolder.get(obj_id)
        
        if not folder:
            raise ValueError(f"Folder not found: {folder_id}")

        logger.info(f"Updating monitored folder {folder_id} with: {updates}")

        # Update fields (handle both None and False values correctly)
        for key, value in updates.items():
            if hasattr(folder, key):
                setattr(folder, key, value)
                logger.debug(f"  Set {key} = {value}")

        folder.updated_at = datetime.utcnow()
        await folder.save()
        
        logger.info(f"✅ Updated monitored folder: {folder.path} (enabled={folder.enabled}, type={folder.content_type})")
        
        return folder

    async def remove_monitored_folder(self, folder_id: str) -> bool:
        """Remove a monitored folder"""
        folder = await MonitoredFolder.get(folder_id)
        
        if not folder:
            return False

        await folder.delete()
        
        # Remove from known files
        if folder_id in self._known_files:
            del self._known_files[folder_id]
        
        logger.info(f"Removed monitored folder: {folder.path}")
        
        return True


# Global folder monitor instance
folder_monitor_service = FolderMonitorService()
