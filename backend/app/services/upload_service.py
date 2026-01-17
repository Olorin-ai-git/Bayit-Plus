"""
Upload Service
Handles file upload queue management, processing, and GCS uploads.
"""

import os
import asyncio
import hashlib
import httpx
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
from uuid import uuid4

from google.cloud import storage as gcs_storage
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.models.upload import (
    UploadJob,
    UploadStatus,
    ContentType,
    UploadJobResponse,
    QueueStats,
)
from app.models.content import Content, Category
from app.services.tmdb_service import TMDBService
from app.core.config import settings

logger = logging.getLogger(__name__)


class UploadService:
    """
    Manages the upload queue and processes file uploads.
    Handles queuing, progress tracking, and uploading to GCS.
    """

    def __init__(self):
        self.processing = False
        self.current_job: Optional[UploadJob] = None
        self.tmdb_service = TMDBService()
        self._lock = asyncio.Lock()
        self._gcs_client: Optional[gcs_storage.Client] = None
        self._websocket_callback = None  # Will be set by connection manager
        self._consecutive_credential_failures = 0  # Track credential failures
        self._queue_paused = False  # Queue pause state
        self._pause_reason: Optional[str] = None  # Reason for pause

    def set_websocket_callback(self, callback):
        """Set callback function for WebSocket broadcasts"""
        self._websocket_callback = callback

    async def _get_gcs_client(self) -> gcs_storage.Client:
        """Get or create GCS client"""
        if self._gcs_client is None:
            self._gcs_client = gcs_storage.Client()
        return self._gcs_client

    def _calculate_file_hash_sync(self, file_path: str) -> str:
        """
        Calculate SHA256 hash of a file for duplicate detection (synchronous).
        Reads file in chunks to handle large files efficiently.
        """
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            # Read file in 4KB chunks
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    async def _calculate_file_hash(self, file_path: str) -> str:
        """
        Calculate SHA256 hash asynchronously in executor to avoid blocking event loop.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._calculate_file_hash_sync, file_path)

    async def enqueue_upload(
        self,
        source_path: str,
        content_type: ContentType,
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        skip_duplicate_check: bool = True,  # Always skip during enqueue - check in background
    ) -> UploadJob:
        """
        Add a new file to the upload queue.
        Hash calculation and duplicate checking happen in background processing to avoid blocking.
        
        Args:
            source_path: Absolute path to the file
            content_type: Type of content (movie, podcast, etc.)
            metadata: Additional metadata
            user_id: ID of user creating the upload
            skip_duplicate_check: Deprecated - hash is always calculated in background
            
        Returns:
            Created UploadJob
        """
        path = Path(source_path)
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {source_path}")
        
        # Get file size
        file_size = path.stat().st_size
        
        # Skip files larger than 10GB to prevent overwhelming the system
        file_size_gb = file_size / (1024 ** 3)
        if file_size_gb > 10:
            raise ValueError(f"File too large ({file_size_gb:.1f}GB, max 10GB): {path.name}")
        
        # Basic duplicate check by filename (fast, non-blocking)
        from beanie.operators import In
        existing_job = await UploadJob.find_one(
            UploadJob.filename == path.name,
            In(UploadJob.status, [UploadStatus.QUEUED, UploadStatus.PROCESSING, UploadStatus.UPLOADING])
        )
        if existing_job:
            logger.warning(f"File with same name already queued: {path.name} (job: {existing_job.job_id})")
            raise ValueError(f"File already in upload queue: {existing_job.filename}")
        
        # Create job WITHOUT hash (will be calculated in background)
        job = UploadJob(
            job_id=str(uuid4()),
            type=content_type,
            source_path=str(path.absolute()),
            filename=path.name,
            file_size=file_size,
            file_hash=None,  # Will be calculated during background processing
            status=UploadStatus.QUEUED,
            metadata=metadata or {},
            created_by=user_id,
        )
        
        await job.insert()
        logger.info(f"✅ Enqueued upload job {job.job_id}: {path.name} (hash will be calculated in background)")
        
        # Broadcast update
        await self._broadcast_queue_update()
        
        # Start processing if not already running (non-blocking background task)
        asyncio.create_task(self.process_queue())
        
        return job

    async def enqueue_multiple(
        self,
        file_paths: List[str],
        content_type: ContentType,
        user_id: Optional[str] = None,
    ) -> List[UploadJob]:
        """
        Enqueue multiple files at once.
        All files are enqueued quickly without blocking hash calculation.
        """
        jobs = []
        for path in file_paths:
            try:
                job = await self.enqueue_upload(path, content_type, user_id=user_id)
                jobs.append(job)
            except Exception as e:
                logger.error(f"Failed to enqueue {path}: {e}")
        
        logger.info(f"✅ Enqueued {len(jobs)} files in batch (hashing will happen in background)")
        return jobs

    async def process_queue(self):
        """
        Process the upload queue.
        Runs continuously until queue is empty.
        """
        async with self._lock:
            if self.processing:
                return  # Already processing
            
            # Check if queue is paused
            if self._queue_paused:
                logger.warning(f"⏸️  Queue is paused: {self._pause_reason}")
                return
            
            self.processing = True

        try:
            while True:
                # Check if queue was paused during processing
                if self._queue_paused:
                    logger.warning(f"⏸️  Queue paused during processing: {self._pause_reason}")
                    break
                
                # Get next queued job (use find() for sorting support)
                jobs = await UploadJob.find(
                    UploadJob.status == UploadStatus.QUEUED
                ).sort("+created_at").limit(1).to_list()
                
                job = jobs[0] if jobs else None
                
                if not job:
                    break  # No more jobs
                
                self.current_job = job
                await self._process_job(job)
                self.current_job = None
                
        finally:
            self.processing = False
            await self._broadcast_queue_update()

    async def _process_job(self, job: UploadJob):
        """Process a single upload job"""
        try:
            logger.info(f"Processing job {job.job_id}: {job.filename}")
            
            # Update status
            job.status = UploadStatus.PROCESSING
            job.started_at = datetime.utcnow()
            await job.save()
            await self._broadcast_queue_update()
            
            # Stage 0: Calculate hash and check for duplicates (if not already done)
            if job.file_hash is None:
                # Check if hash was pre-calculated during folder scan (from cache)
                pre_calculated_hash = job.metadata.get('pre_calculated_hash')
                
                if pre_calculated_hash:
                    logger.info(f"Using cached hash for {job.filename}: {pre_calculated_hash[:16]}...")
                    job.file_hash = pre_calculated_hash
                    job.stages["hash_calculation"] = "completed"
                    job.progress = 10.0
                    await job.save()
                    await self._broadcast_queue_update()
                else:
                    # Calculate hash in background
                    job.stages["hash_calculation"] = "in_progress"
                    job.stage_timings["hash_calculation"] = {"started": datetime.utcnow().isoformat()}
                    job.progress = 5.0  # Show some progress during hash calculation
                    await job.save()
                    await self._broadcast_queue_update()

                    logger.info(f"📊 Calculating hash in background for {job.filename}...")
                    hash_start_time = datetime.utcnow()
                    job.file_hash = await self._calculate_file_hash(job.source_path)
                    hash_duration = (datetime.utcnow() - hash_start_time).total_seconds()
                    logger.info(f"✓ Hash calculated: {job.file_hash[:16]}... (will be stored in DB)")

                    job.stages["hash_calculation"] = "completed"
                    job.stage_timings["hash_calculation"]["completed"] = datetime.utcnow().isoformat()
                    job.stage_timings["hash_calculation"]["duration_seconds"] = round(hash_duration, 2)
                    job.progress = 10.0
                    await job.save()
                    await self._broadcast_queue_update()
                
                # Check if file with this hash already exists in Content collection
                from motor.motor_asyncio import AsyncIOMotorClient
                client = AsyncIOMotorClient(settings.MONGODB_URL)
                db = client[settings.MONGODB_DB_NAME]
                
                existing_content = await db.content.find_one({'file_hash': job.file_hash})
                if existing_content:
                    logger.warning(f"Duplicate file detected: {job.filename} (hash: {job.file_hash[:16]}...)")
                    job.status = UploadStatus.FAILED
                    job.error_message = f"Duplicate: Already in library as '{existing_content.get('title', job.filename)}'"
                    job.completed_at = datetime.utcnow()
                    await job.save()
                    await self._broadcast_queue_update()
                    return
                
                await job.save()
                await self._broadcast_queue_update()
            
            # Stage 1: Extract metadata
            job.stages["metadata_extraction"] = "in_progress"
            job.stage_timings["metadata_extraction"] = {"started": datetime.utcnow().isoformat()}
            job.progress = 15.0
            await job.save()
            await self._broadcast_queue_update()

            metadata_start_time = datetime.utcnow()
            if job.type == ContentType.MOVIE:
                metadata = await self._extract_movie_metadata(job)
            elif job.type == ContentType.SERIES:
                metadata = await self._extract_series_metadata(job)
            elif job.type == ContentType.PODCAST:
                metadata = await self._extract_podcast_metadata(job)
            else:
                metadata = {}
            metadata_duration = (datetime.utcnow() - metadata_start_time).total_seconds()

            job.metadata.update(metadata)
            job.stages["metadata_extraction"] = "completed"
            job.stage_timings["metadata_extraction"]["completed"] = datetime.utcnow().isoformat()
            job.stage_timings["metadata_extraction"]["duration_seconds"] = round(metadata_duration, 2)
            job.progress = 20.0
            await job.save()
            await self._broadcast_queue_update()
            
            # Stage 1.5: Extract subtitles from local file (for video content)
            if job.type == ContentType.MOVIE and os.path.exists(job.source_path):
                # Schedule subtitle extraction as background task (don't block upload)
                job.stages["subtitle_extraction"] = "scheduled"
                job.metadata["local_source_path"] = job.source_path
                await job.save()
                logger.info(f"Subtitle extraction scheduled for background: {job.source_path}")
            
            # Stage 2: Upload to GCS
            job.status = UploadStatus.UPLOADING
            job.stages["gcs_upload"] = "in_progress"
            job.stage_timings["gcs_upload"] = {"started": datetime.utcnow().isoformat()}
            await job.save()
            await self._broadcast_queue_update()

            gcs_start_time = datetime.utcnow()
            destination_url = await self._upload_to_gcs(job)
            gcs_duration = (datetime.utcnow() - gcs_start_time).total_seconds()

            if not destination_url:
                raise Exception("GCS upload failed")

            job.destination_url = destination_url
            job.stages["gcs_upload"] = "completed"
            job.stage_timings["gcs_upload"]["completed"] = datetime.utcnow().isoformat()
            job.stage_timings["gcs_upload"]["duration_seconds"] = round(gcs_duration, 2)
            await job.save()
            
            # Stage 3: Create content entry in database
            job.stages["database_insert"] = "in_progress"
            job.stage_timings["database_insert"] = {"started": datetime.utcnow().isoformat()}
            job.progress = 96.0
            await job.save()
            await self._broadcast_queue_update()

            db_start_time = datetime.utcnow()
            await self._create_content_entry(job)
            db_duration = (datetime.utcnow() - db_start_time).total_seconds()
            
            job.stages["database_insert"] = "completed"
            job.stage_timings["database_insert"]["completed"] = datetime.utcnow().isoformat()
            job.stage_timings["database_insert"]["duration_seconds"] = round(db_duration, 2)
            job.progress = 98.0
            await job.save()
            await self._broadcast_queue_update()
            
            # Mark as completed (critical stages done)
            job.status = UploadStatus.COMPLETED
            job.progress = 100.0
            job.completed_at = datetime.utcnow()
            await job.save()
            await self._broadcast_queue_update()
            
            logger.info(f"Job {job.job_id} completed successfully")
            
            # ============ NON-CRITICAL ENRICHMENT STAGES ============
            # These run in background and don't affect the upload success status
            
            # Stage 4 (Optional): IMDB/TMDB lookup for movies
            if job.type == ContentType.MOVIE and job.metadata.get("content_id"):
                job.stages["imdb_lookup"] = "scheduled"
                await job.save()
                asyncio.create_task(self._fetch_imdb_info_background(
                    job.metadata.get("content_id"),
                    job.job_id
                ))
            else:
                job.stages["imdb_lookup"] = "skipped"
                await job.save()
            
            # Stage 5 (Optional): Subtitle extraction
            if job.stages.get("subtitle_extraction") == "scheduled" and job.metadata.get("local_source_path"):
                asyncio.create_task(self._extract_subtitles_background(
                    job.metadata.get("content_id"),
                    job.metadata.get("local_source_path"),
                    job.job_id
                ))
            elif job.type != ContentType.MOVIE:
                job.stages["subtitle_extraction"] = "skipped"
                await job.save()
            
            await self._broadcast_queue_update()
            
        except Exception as e:
            logger.error(f"Job {job.job_id} failed: {e}", exc_info=True)
            
            job.status = UploadStatus.FAILED
            job.error_message = str(e)
            job.retry_count += 1
            await job.save()
            
            # Check if this is a credential error
            is_credential_error = self._is_credential_error(e)
            
            if is_credential_error:
                self._consecutive_credential_failures += 1
                logger.warning(f"Credential failure detected ({self._consecutive_credential_failures}/3)")
                
                # Pause queue after 3 consecutive credential failures
                if self._consecutive_credential_failures >= 3:
                    self._queue_paused = True
                    self._pause_reason = "GCS credentials not configured or invalid. Please check GOOGLE_APPLICATION_CREDENTIALS environment variable."
                    logger.error(f"🚨 QUEUE PAUSED: {self._pause_reason}")
                    
                    # Mark all queued jobs with a warning
                    await self._notify_queue_paused()
                    return  # Stop processing
            else:
                # Reset counter if it's not a credential error
                self._consecutive_credential_failures = 0
            
            # Retry if not exceeded max retries
            if job.retry_count < job.max_retries:
                job.status = UploadStatus.QUEUED
                await job.save()
                logger.info(f"Job {job.job_id} requeued for retry ({job.retry_count}/{job.max_retries})")
        
        finally:
            await self._broadcast_queue_update()

    async def _extract_movie_metadata(self, job: UploadJob) -> Dict[str, Any]:
        """Extract metadata for a movie file"""
        # Parse filename
        filename = Path(job.filename).stem
        
        # Try to extract title and year
        import re
        
        # Remove quality indicators
        title = re.sub(r'\[?(720p|1080p|2160p|4K|UHD|HD)\]?', '', filename, flags=re.IGNORECASE)
        title = re.sub(r'\[?(WEBRip|BluRay|BRRip|HDRip|WEB-DL|DVDRip)\]?', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\[?(x264|x265|H\.264|H\.265|HEVC)\]?', '', title, flags=re.IGNORECASE)
        
        # Extract year
        year_match = re.search(r'[\(\[]?(\d{4})[\)\]]?', title)
        year = int(year_match.group(1)) if year_match else None
        
        if year:
            title = re.sub(r'[\(\[]?\d{4}[\)\]]?', '', title)
        
        # Clean up title
        title = re.sub(r'[._]', ' ', title)
        title = re.sub(r'\s+', ' ', title).strip()
        
        metadata = {
            'title': title,
            'year': year,
        }
        
        # Fetch from TMDB if available
        if title:
            try:
                tmdb_data = await self.tmdb_service.search_movie(title, year)
                if tmdb_data:
                    metadata.update(tmdb_data)
            except Exception as e:
                logger.warning(f"TMDB lookup failed for '{title}': {e}")
        
        return metadata

    async def _extract_series_metadata(self, job: UploadJob) -> Dict[str, Any]:
        """Extract metadata for a series file"""
        # Parse filename
        filename = Path(job.filename).stem
        
        import re
        
        # Remove quality indicators
        title = re.sub(r'\[?(720p|1080p|2160p|4K|UHD|HD)\]?', '', filename, flags=re.IGNORECASE)
        title = re.sub(r'\[?(WEBRip|BluRay|BRRip|HDRip|WEB-DL|DVDRip)\]?', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\[?(x264|x265|H\.264|H\.265|HEVC)\]?', '', title, flags=re.IGNORECASE)
        
        # Try to extract season/episode info (S01E01, 1x01, etc.)
        season_ep_match = re.search(r'[Ss](\d{1,2})[Ee](\d{1,2})', title)
        season = int(season_ep_match.group(1)) if season_ep_match else None
        episode = int(season_ep_match.group(2)) if season_ep_match else None
        
        # Remove season/episode from title
        if season_ep_match:
            title = title[:season_ep_match.start()]
        
        # Alternative format: 1x01
        if not season:
            alt_match = re.search(r'(\d{1,2})x(\d{1,2})', title)
            if alt_match:
                season = int(alt_match.group(1))
                episode = int(alt_match.group(2))
                title = title[:alt_match.start()]
        
        # Extract year
        year_match = re.search(r'[\(\[]?(\d{4})[\)\]]?', title)
        year = int(year_match.group(1)) if year_match else None
        
        if year:
            title = re.sub(r'[\(\[]?\d{4}[\)\]]?', '', title)
        
        # Clean up title
        title = re.sub(r'[._]', ' ', title)
        title = re.sub(r'\s+', ' ', title).strip()
        
        metadata = {
            'title': title,
            'year': year,
            'season': season,
            'episode': episode,
        }
        
        # Fetch from TMDB if available
        if title:
            try:
                tmdb_data = await self.tmdb_service.enrich_series_content(title, year)
                if tmdb_data:
                    metadata.update(tmdb_data)
            except Exception as e:
                logger.warning(f"TMDB lookup failed for series '{title}': {e}")
        
        return metadata

    async def _extract_podcast_metadata(self, job: UploadJob) -> Dict[str, Any]:
        """Extract metadata for a podcast episode file"""
        # Basic metadata extraction
        # Could be extended with audio file parsing (mutagen, etc.)
        filename = Path(job.filename).stem
        
        return {
            'title': filename,
        }

    async def _upload_to_gcs(self, job: UploadJob) -> Optional[str]:
        """
        Upload file to Google Cloud Storage with progress tracking.
        
        Returns:
            Public URL of uploaded file
        """
        try:
            client = await self._get_gcs_client()
            bucket = client.bucket(settings.GCS_BUCKET_NAME)
            
            # Generate destination path
            content_type_path = job.type.value + "s"  # movies, podcasts, etc.
            filename = Path(job.filename).name
            
            # Create a safe folder name from the title (if available)
            import re
            if job.metadata.get('title'):
                # Remove special characters and replace spaces with underscores
                safe_title = re.sub(r'[^\w\s-]', '', job.metadata['title']).replace(' ', '_')
                destination_blob_name = f"{content_type_path}/{safe_title}/{filename}"
            else:
                # Fallback: use first 8 chars of file hash for uniqueness
                file_hash = job.file_hash[:8] if job.file_hash else hashlib.md5(job.source_path.encode()).hexdigest()[:8]
                destination_blob_name = f"{content_type_path}/{file_hash}_{filename}"
            
            job.gcs_path = destination_blob_name
            await job.save()
            
            blob = bucket.blob(destination_blob_name)
            
            # Check if already exists
            if blob.exists():
                logger.info(f"File already exists in GCS: {destination_blob_name}")
                public_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{destination_blob_name}"
                job.progress = 100.0
                job.bytes_uploaded = job.file_size or 0
                await job.save()
                return public_url
            
            # Determine content type
            content_type = self._get_content_type(job.filename)
            
            # Upload with progress tracking
            start_time = datetime.utcnow()
            file_size = job.file_size or Path(job.source_path).stat().st_size
            
            # Show upload starting progress
            job.progress = 25.0
            job.bytes_uploaded = 0
            await job.save()
            await self._broadcast_queue_update()
            
            # Create a progress tracking wrapper
            class ProgressFileWrapper:
                def __init__(self, file_obj, job_ref, service_ref, file_size):
                    self.file = file_obj
                    self.job = job_ref
                    self.service = service_ref
                    self.file_size = file_size
                    self.bytes_read = 0
                    self.last_update = datetime.utcnow()
                    self.start_time = start_time
                    
                def read(self, size=-1):
                    chunk = self.file.read(size)
                    if chunk:
                        self.bytes_read += len(chunk)
                        
                        # Update progress every 2MB or every 2 seconds
                        now = datetime.utcnow()
                        time_since_update = (now - self.last_update).total_seconds()
                        
                        if self.bytes_read % (2 * 1024 * 1024) < len(chunk) or time_since_update >= 2:
                            # Calculate progress (25% to 95% range for upload)
                            upload_progress = (self.bytes_read / self.file_size) * 70.0
                            self.job.progress = 25.0 + upload_progress
                            self.job.bytes_uploaded = self.bytes_read
                            
                            # Calculate speed and ETA
                            elapsed = (now - self.start_time).total_seconds()
                            if elapsed > 0:
                                self.job.upload_speed = self.bytes_read / elapsed
                                remaining_bytes = self.file_size - self.bytes_read
                                self.job.eta_seconds = int(remaining_bytes / self.job.upload_speed) if self.job.upload_speed > 0 else None
                            
                            # Schedule async update
                            asyncio.create_task(self._async_update())
                            self.last_update = now
                    
                    return chunk
                
                async def _async_update(self):
                    await self.job.save()
                    await self.service._broadcast_queue_update()
                
                def seek(self, pos, whence=0):
                    return self.file.seek(pos, whence)
                
                def tell(self):
                    return self.file.tell()
            
            # Upload with progress wrapper
            with open(job.source_path, 'rb') as file_obj:
                progress_wrapper = ProgressFileWrapper(file_obj, job, self, file_size)
                blob.upload_from_file(
                    progress_wrapper,
                    content_type=content_type,
                    size=file_size,
                )
            
            # Final progress update after successful upload
            job.progress = 95.0
            job.bytes_uploaded = file_size
            
            # Calculate final upload speed
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            if elapsed > 0:
                job.upload_speed = file_size / elapsed
            
            job.eta_seconds = None
            await job.save()
            await self._broadcast_queue_update()
            
            # Get public URL
            public_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{destination_blob_name}"
            logger.info(f"Uploaded to GCS: {public_url}")
            
            return public_url
            
        except Exception as e:
            logger.error(f"GCS upload failed: {e}", exc_info=True)
            return None

    def _get_content_type(self, filename: str) -> str:
        """Determine MIME type from filename"""
        ext = Path(filename).suffix.lower()
        
        content_types = {
            '.mp4': 'video/mp4',
            '.mkv': 'video/x-matroska',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
            '.webm': 'video/webm',
            '.mp3': 'audio/mpeg',
            '.m4a': 'audio/mp4',
            '.wav': 'audio/wav',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.srt': 'text/plain',
            '.vtt': 'text/vtt',
        }
        
        return content_types.get(ext, 'application/octet-stream')

    async def _create_content_entry(self, job: UploadJob):
        """Create content entry in database"""
        try:
            if job.type == ContentType.MOVIE:
                await self._create_movie_entry(job)
            elif job.type == ContentType.SERIES:
                await self._create_series_entry(job)
            elif job.type == ContentType.PODCAST:
                await self._create_podcast_episode_entry(job)
            else:
                logger.warning(f"No handler for content type: {job.type}")
            
        except Exception as e:
            logger.error(f"Failed to create content entry: {e}", exc_info=True)
            raise

    async def _create_movie_entry(self, job: UploadJob):
        """Create a movie content entry"""
        # Get or create Movies category
        category = await Category.find_one(Category.name == "Movies")
        if not category:
            category = Category(
                name="Movies",
                name_he="סרטים",
                slug="movies",
                icon="film",
                is_active=True,
                order=1,
            )
            await category.insert()
        
        # Check if content already exists
        existing = await Content.find_one(
            Content.stream_url == job.destination_url
        )
        
        if existing:
            logger.info(f"Content already exists: {existing.title}")
            return
        
        # Create content
        metadata = job.metadata
        
        content = Content(
            title=metadata.get('title', job.filename),
            title_en=metadata.get('title_en', metadata.get('title')),
            description=metadata.get('description'),
            description_en=metadata.get('description_en', metadata.get('description')),
            thumbnail=metadata.get('thumbnail'),
            backdrop=metadata.get('backdrop'),
            poster_url=metadata.get('poster_url'),
            category_id=str(category.id),
            category_name="Movies",
            type="vod",
            stream_url=job.destination_url,
            year=metadata.get('year'),
            rating=metadata.get('rating'),
            imdb_rating=metadata.get('imdb_rating'),
            tmdb_id=metadata.get('tmdb_id'),
            imdb_id=metadata.get('imdb_id'),
            genre=metadata.get('genre'),
            cast=metadata.get('cast', []),
            director=metadata.get('director'),
            is_featured=False,
            view_count=0,
            file_hash=job.file_hash,  # Store SHA256 hash for duplicate detection
            file_size=job.file_size,  # Store file size for quick duplicate checks
        )
        
        await content.insert()
        logger.info(f"Created movie content: {content.title} (hash: {job.file_hash[:16] if job.file_hash else 'none'}...)")
        
        # Store content ID in job metadata for reference
        job.metadata['content_id'] = str(content.id)
        await job.save()
        
        # Save extracted subtitles if any
        extracted_subs = metadata.get('extracted_subtitles', [])
        if extracted_subs:
            logger.info(f"Saving {len(extracted_subs)} extracted subtitles to database")
            from app.models.subtitles import SubtitleTrackDoc, SubtitleCueModel
            from app.services.subtitle_service import parse_srt
            
            for sub_data in extracted_subs:
                try:
                    # Parse subtitle content
                    cues = parse_srt(sub_data['content'])
                    
                    # Create subtitle track document
                    subtitle_track = SubtitleTrackDoc(
                        content_id=str(content.id),
                        language=sub_data['language'],
                        source='embedded',
                        format=sub_data.get('format', 'srt'),
                        codec=sub_data.get('codec', 'unknown'),
                        cues=[SubtitleCueModel(**cue) for cue in cues],
                        is_default=sub_data['language'] == 'en',  # English as default
                    )
                    
                    await subtitle_track.insert()
                    logger.info(f"✅ Saved {sub_data['language']} subtitles ({len(cues)} cues)")
                    
                except Exception as e:
                    logger.error(f"Failed to save {sub_data['language']} subtitles: {str(e)}")
            
            # Update content with subtitle info
            content.embedded_subtitle_count = len(extracted_subs)
            content.available_subtitle_languages = [s['language'] for s in extracted_subs]
            content.subtitle_extraction_status = 'completed'
            await content.save()

    async def _create_series_entry(self, job: UploadJob):
        """Create a series content entry"""
        # Get or create Series category
        category = await Category.find_one(Category.name == "Series")
        if not category:
            category = Category(
                name="Series",
                name_he="סדרות",
                name_en="Series",
                name_es="Series",
                slug="series",
                icon="tv",
                is_active=True,
                order=2,
            )
            await category.insert()
        
        # Check if content already exists
        existing = await Content.find_one(
            Content.stream_url == job.destination_url
        )
        
        if existing:
            logger.info(f"Content already exists: {existing.title}")
            return
        
        # Create content with is_series=True
        metadata = job.metadata
        
        content = Content(
            title=metadata.get('title', job.filename),
            title_en=metadata.get('title_en', metadata.get('title')),
            description=metadata.get('description'),
            description_en=metadata.get('description_en', metadata.get('description')),
            thumbnail=metadata.get('thumbnail'),
            backdrop=metadata.get('backdrop'),
            poster_url=metadata.get('poster_url'),
            category_id=str(category.id),
            category_name="Series",
            content_type="series",
            stream_url=job.destination_url,
            year=metadata.get('year'),
            rating=metadata.get('rating'),
            imdb_rating=metadata.get('imdb_rating'),
            tmdb_id=metadata.get('tmdb_id'),
            imdb_id=metadata.get('imdb_id'),
            genre=metadata.get('genre'),
            cast=metadata.get('cast', []),
            director=metadata.get('director'),
            is_series=True,  # Mark as series
            is_featured=False,
            view_count=0,
            file_hash=job.file_hash,
            file_size=job.file_size,
        )
        
        await content.insert()
        logger.info(f"Created series content: {content.title} (is_series=True, hash: {job.file_hash[:16] if job.file_hash else 'none'}...)")
        
        # Store content ID in job metadata for reference
        job.metadata['content_id'] = str(content.id)
        await job.save()
        
        # Save extracted subtitles if any
        extracted_subs = metadata.get('extracted_subtitles', [])
        if extracted_subs:
            logger.info(f"Saving {len(extracted_subs)} extracted subtitles to database")
            from app.models.subtitles import SubtitleTrackDoc, SubtitleCueModel
            from app.services.subtitle_service import parse_srt
            
            for sub_data in extracted_subs:
                try:
                    cues = parse_srt(sub_data['content'])
                    subtitle_track = SubtitleTrackDoc(
                        content_id=str(content.id),
                        language=sub_data['language'],
                        source='embedded',
                        format=sub_data.get('format', 'srt'),
                        codec=sub_data.get('codec', 'unknown'),
                        cues=[SubtitleCueModel(**cue) for cue in cues],
                        is_default=sub_data['language'] == 'en',
                    )
                    await subtitle_track.insert()
                    logger.info(f"✅ Saved {sub_data['language']} subtitles ({len(cues)} cues)")
                except Exception as e:
                    logger.error(f"Failed to save {sub_data['language']} subtitles: {str(e)}")
            
            content.embedded_subtitle_count = len(extracted_subs)
            content.available_subtitle_languages = [s['language'] for s in extracted_subs]
            content.subtitle_extraction_status = 'completed'
            await content.save()

    async def _create_podcast_episode_entry(self, job: UploadJob):
        """Create a podcast episode content entry"""
        # Implementation for podcast episodes
        logger.info("Podcast episode creation not yet implemented")

    async def get_queue(self) -> List[UploadJob]:
        """Get all queued jobs"""
        return await UploadJob.find(
            UploadJob.status == UploadStatus.QUEUED
        ).sort("+created_at").to_list()

    async def get_active_job(self) -> Optional[UploadJob]:
        """Get currently processing job"""
        from beanie.operators import In
        return await UploadJob.find_one(
            In(UploadJob.status, [UploadStatus.PROCESSING, UploadStatus.UPLOADING])
        )

    async def get_recent_completed(self, limit: int = 10) -> List[UploadJob]:
        """Get recently completed jobs"""
        from beanie.operators import In
        return await UploadJob.find(
            In(UploadJob.status, [UploadStatus.COMPLETED, UploadStatus.FAILED, UploadStatus.CANCELLED])
        ).sort("-completed_at").limit(limit).to_list()

    async def get_job(self, job_id: str) -> Optional[UploadJob]:
        """Get a specific job by ID"""
        return await UploadJob.find_one(UploadJob.job_id == job_id)

    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a job"""
        job = await self.get_job(job_id)
        
        if not job:
            return False
        
        if job.status in [UploadStatus.COMPLETED, UploadStatus.FAILED, UploadStatus.CANCELLED]:
            return False  # Already finished
        
        job.status = UploadStatus.CANCELLED
        job.error_message = "Cancelled by user"
        await job.save()
        
        logger.info(f"Cancelled job {job_id}")
        await self._broadcast_queue_update()
        
        return True

    async def clear_queue(self) -> dict:
        """
        Clear the upload queue by cancelling all queued and processing jobs.
        
        Returns:
            dict with counts of cancelled jobs
        """
        from beanie.operators import In
        
        # Find all jobs that are queued or processing
        active_jobs = await UploadJob.find(
            In(UploadJob.status, [UploadStatus.QUEUED, UploadStatus.PROCESSING, UploadStatus.UPLOADING])
        ).to_list()
        
        cancelled_count = 0
        for job in active_jobs:
            job.status = UploadStatus.CANCELLED
            job.error_message = "Cancelled by queue clear"
            await job.save()
            cancelled_count += 1
        
        logger.info(f"Cleared upload queue: {cancelled_count} jobs cancelled")
        await self._broadcast_queue_update()
        
        return {
            "success": True,
            "cancelled_count": cancelled_count,
            "message": f"Cleared {cancelled_count} job(s) from queue"
        }

    async def get_queue_stats(self) -> QueueStats:
        """Get statistics about the queue"""
        # Efficiently count by status using database queries (not fetching all records)
        from beanie.operators import In
        
        # Get all failed/cancelled jobs to categorize them as actual failures vs duplicates
        failed_and_cancelled = await UploadJob.find(
            In(UploadJob.status, [UploadStatus.FAILED, UploadStatus.CANCELLED])
        ).to_list()
        
        # Separate duplicates (informational skips) from actual failures
        skipped_count = 0
        actual_failed_count = 0
        
        for job in failed_and_cancelled:
            if job.error_message:
                error_lower = job.error_message.lower()
                # Check if it's a duplicate (informational skip)
                if ('duplicate' in error_lower or 
                    'already in library' in error_lower or 
                    'already exists' in error_lower):
                    skipped_count += 1
                else:
                    actual_failed_count += 1
            else:
                actual_failed_count += 1
        
        stats = QueueStats(
            total_jobs=await UploadJob.count(),
            queued=await UploadJob.find(UploadJob.status == UploadStatus.QUEUED).count(),
            processing=await UploadJob.find(In(UploadJob.status, [UploadStatus.PROCESSING, UploadStatus.UPLOADING])).count(),
            completed=await UploadJob.find(UploadJob.status == UploadStatus.COMPLETED).count(),
            failed=actual_failed_count,  # Only actual failures
            cancelled=0,  # Included in failed or skipped already
            skipped=skipped_count,  # Duplicates and informational skips
            total_size_bytes=0,  # Not displayed in UI, skipping expensive calculation
            uploaded_bytes=0,    # Not displayed in UI, skipping expensive calculation
        )
        
        return stats

    def _is_credential_error(self, error: Exception) -> bool:
        """Check if error is related to GCS credentials"""
        error_str = str(error).lower()
        error_type = type(error).__name__
        
        # Check for common credential error patterns
        credential_indicators = [
            "defaultcredentialserror",
            "credentials were not found",
            "could not automatically determine credentials",
            "application default credentials",
            "google.auth.exceptions",
            "authentication failed",
            "invalid credentials",
            "permission denied",
        ]
        
        return any(indicator in error_str for indicator in credential_indicators) or \
               "DefaultCredentialsError" in error_type
    
    async def _notify_queue_paused(self):
        """Notify about queue pause and update stats"""
        try:
            # Log the pause
            logger.error(f"🚨 Upload queue paused after 3 consecutive credential failures")
            logger.error(f"📋 Reason: {self._pause_reason}")
            logger.error(f"💡 Solution: Configure GOOGLE_APPLICATION_CREDENTIALS environment variable")
            
            # Broadcast update via WebSocket
            await self._broadcast_queue_update()
            
        except Exception as e:
            logger.error(f"Error notifying queue pause: {e}")
    
    async def resume_queue(self):
        """Resume the paused queue (call this after fixing credentials)"""
        if self._queue_paused:
            self._queue_paused = False
            self._pause_reason = None
            self._consecutive_credential_failures = 0
            logger.info("✅ Upload queue resumed")
            
            # Restart processing
            await self.process_queue()

    def _job_to_response(self, job: UploadJob) -> UploadJobResponse:
        """Convert UploadJob to UploadJobResponse with current_stage and stages"""
        response = UploadJobResponse.from_orm(job)
        response.current_stage = job.get_current_stage()
        response.stages = job.stages or {}
        return response

    async def _broadcast_queue_update(self):
        """Broadcast queue update via WebSocket"""
        if self._websocket_callback:
            try:
                stats = await self.get_queue_stats()
                active_job = await self.get_active_job()
                queue = await self.get_queue()
                recent = await self.get_recent_completed(5)
                
                # Add queue pause info to the broadcast
                # Use model_dump(mode='json') to properly serialize datetime objects
                # Use _job_to_response to include stages and current_stage
                message = {
                    "type": "queue_update",
                    "stats": stats.model_dump(mode='json'),
                    "active_job": self._job_to_response(active_job).model_dump(mode='json') if active_job else None,
                    "queue": [self._job_to_response(j).model_dump(mode='json') for j in queue],
                    "recent_completed": [self._job_to_response(j).model_dump(mode='json') for j in recent],
                    "queue_paused": self._queue_paused,
                    "pause_reason": self._pause_reason,
                }
                
                await self._websocket_callback(message)
            except Exception as e:
                logger.error(f"Failed to broadcast queue update: {e}")

    async def _fetch_imdb_info_background(self, content_id: str, job_id: str):
        """
        Fetch IMDB/TMDB info in background without blocking the upload queue.
        Updates the content entry with enriched metadata.
        """
        try:
            logger.info(f"[Background] Starting IMDB/TMDB lookup for job {job_id}")
            
            # Get the job and update stage
            imdb_start_time = datetime.utcnow()
            job = await UploadJob.find_one(UploadJob.job_id == job_id)
            if job:
                job.stages["imdb_lookup"] = "in_progress"
                job.stage_timings["imdb_lookup"] = {"started": datetime.utcnow().isoformat()}
                await job.save()
                await self._broadcast_queue_update()
            
            from app.models.content import Content
            from beanie import PydanticObjectId
            
            content = await Content.get(PydanticObjectId(content_id))
            if not content:
                logger.error(f"[Background] Content not found: {content_id}")
                if job:
                    job.stages["imdb_lookup"] = "skipped"
                    await job.save()
                    await self._broadcast_queue_update()
                return
            
            # Use TMDB service to fetch metadata
            title = content.title or ""
            year = content.year  # Content model uses 'year' not 'release_year'
            
            if title:
                details = None
                is_tv_series = False
                
                # First try movie search
                search_results = await self.tmdb_service.search_movie(title, year=year)
                
                if search_results:
                    best_match = search_results[0]
                    tmdb_id = best_match.get("id")
                    if tmdb_id:
                        details = await self.tmdb_service.get_movie_details(tmdb_id)
                
                # If no movie found, try TV series (for series like "1883")
                if not details:
                    logger.info(f"[Background] No movie match for '{title}', trying TV series...")
                    tv_result = await self.tmdb_service.search_tv_series(title, year=year)
                    
                    if tv_result:
                        is_tv_series = True
                        tmdb_id = tv_result.get("id")
                        logger.info(f"[Background] Found TV series match: {tv_result.get('name')} (TMDB ID: {tmdb_id})")
                        
                        # Get TV series details
                        if tmdb_id:
                            try:
                                async with httpx.AsyncClient() as client:
                                    response = await client.get(
                                        f"https://api.themoviedb.org/3/tv/{tmdb_id}",
                                        params={"api_key": self.tmdb_service.api_key, "language": "en-US"}
                                    )
                                    if response.status_code == 200:
                                        details = response.json()
                            except Exception as e:
                                logger.warning(f"[Background] Failed to get TV details: {e}")
                
                if details:
                    # Update content with enriched data
                    if details.get("overview") and not content.description:
                        content.description = details["overview"]
                    
                    # Poster path
                    if details.get("poster_path"):
                        content.thumbnail_url = f"https://image.tmdb.org/t/p/w500{details['poster_path']}"
                    
                    # Backdrop path
                    if details.get("backdrop_path") and not content.banner_url:
                        content.banner_url = f"https://image.tmdb.org/t/p/original{details['backdrop_path']}"
                    
                    # Genres
                    if details.get("genres"):
                        content.genres = [g["name"] for g in details["genres"]]
                    
                    # Rating
                    if details.get("vote_average"):
                        content.rating = details["vote_average"]
                    
                    # Runtime (movies) or episode_run_time (TV)
                    if details.get("runtime"):
                        content.duration = details["runtime"] * 60
                    elif details.get("episode_run_time") and len(details["episode_run_time"]) > 0:
                        content.duration = details["episode_run_time"][0] * 60
                    
                    # Store TMDB metadata
                    content.metadata = content.metadata or {}
                    if details.get("imdb_id"):
                        content.metadata["imdb_id"] = details["imdb_id"]
                    content.metadata["tmdb_id"] = tmdb_id
                    content.metadata["tmdb_type"] = "tv" if is_tv_series else "movie"
                    
                    # For TV series, store additional info
                    if is_tv_series:
                        content.metadata["series_name"] = details.get("name") or details.get("original_name")
                        content.metadata["first_air_date"] = details.get("first_air_date")
                        if details.get("number_of_seasons"):
                            content.metadata["total_seasons"] = details["number_of_seasons"]
                    
                    await content.save()
                    logger.info(f"[Background] Updated content with TMDB {'TV' if is_tv_series else 'movie'} data for job {job_id}")
            
            # Mark stage as completed
            if job:
                imdb_duration = (datetime.utcnow() - imdb_start_time).total_seconds()
                job.stages["imdb_lookup"] = "completed"
                job.stage_timings["imdb_lookup"]["completed"] = datetime.utcnow().isoformat()
                job.stage_timings["imdb_lookup"]["duration_seconds"] = round(imdb_duration, 2)
                await job.save()
                await self._broadcast_queue_update()
            
            logger.info(f"[Background] IMDB/TMDB lookup completed for job {job_id}")
            
        except Exception as e:
            logger.error(f"[Background] IMDB lookup failed for job {job_id}: {e}", exc_info=True)
            # Mark as skipped on error (non-critical)
            try:
                job = await UploadJob.find_one(UploadJob.job_id == job_id)
                if job:
                    job.stages["imdb_lookup"] = "skipped"
                    await job.save()
                    await self._broadcast_queue_update()
            except:
                pass

    async def _extract_subtitles_background(self, content_id: str, local_path: str, job_id: str):
        """
        Extract subtitles in background without blocking the upload queue.
        Runs as a separate async task after upload completes.
        """
        try:
            logger.info(f"[Background] Starting subtitle extraction for job {job_id}")
            
            # Update job stage
            subtitle_start_time = datetime.utcnow()
            job = await UploadJob.find_one(UploadJob.job_id == job_id)
            if job:
                job.stages["subtitle_extraction"] = "in_progress"
                job.stage_timings["subtitle_extraction"] = {"started": datetime.utcnow().isoformat()}
                await job.save()
                await self._broadcast_queue_update()
            
            # Check if file still exists
            if not os.path.exists(local_path):
                logger.warning(f"[Background] Local file no longer exists: {local_path}")
                if job:
                    job.stages["subtitle_extraction"] = "skipped"
                    await job.save()
                    await self._broadcast_queue_update()
                return
            
            from app.services.ffmpeg_service import FFmpegService
            from app.models.content import Content
            from app.models.subtitles import SubtitleTrackDoc, SubtitleCueModel
            from app.services.subtitle_service import parse_srt
            from beanie import PydanticObjectId
            
            ffmpeg = FFmpegService()
            
            # Extract subtitles (this is the slow part, but now it's in background)
            # Limit to 10 subtitles max, prioritizing he, en, es
            extracted_subs = await ffmpeg.extract_all_subtitles(
                local_path,
                languages=['en', 'he', 'es'],
                max_parallel=3,
                max_subtitles=10  # Max 10 subtitles per movie
            )
            
            if not extracted_subs:
                logger.info(f"[Background] No subtitles found for job {job_id}")
                return
            
            # Save to database
            content = await Content.get(PydanticObjectId(content_id))
            if not content:
                logger.error(f"[Background] Content not found: {content_id}")
                return
            
            saved_count = 0
            for sub_data in extracted_subs:
                try:
                    # Parse and save subtitle
                    parsed_track = parse_srt(sub_data["content"])
                    subtitle_track = SubtitleTrackDoc(
                        content_id=content_id,
                        language=sub_data.get("language", "und"),
                        format=sub_data.get("format", "srt"),
                        source="embedded",
                        cues=[SubtitleCueModel(
                            index=cue.index,
                            start_time=cue.start_time,
                            end_time=cue.end_time,
                            text=cue.text
                        ) for cue in parsed_track.cues]
                    )
                    await subtitle_track.insert()
                    saved_count += 1
                except Exception as e:
                    logger.error(f"[Background] Failed to save subtitle: {e}")
            
            # Update content
            if saved_count > 0:
                content.subtitle_extraction_status = "completed"
                content.subtitle_last_checked = datetime.utcnow()
                existing_languages = set(t.language for t in await SubtitleTrackDoc.get_for_content(content_id))
                content.available_subtitle_languages = sorted(list(existing_languages))
                await content.save()
                
            logger.info(f"[Background] Saved {saved_count} subtitle tracks for job {job_id}")
            
            # Mark stage as completed
            job = await UploadJob.find_one(UploadJob.job_id == job_id)
            if job:
                subtitle_duration = (datetime.utcnow() - subtitle_start_time).total_seconds()
                job.stages["subtitle_extraction"] = "completed"
                job.stage_timings["subtitle_extraction"]["completed"] = datetime.utcnow().isoformat()
                job.stage_timings["subtitle_extraction"]["duration_seconds"] = round(subtitle_duration, 2)
                await job.save()
                await self._broadcast_queue_update()
            
        except Exception as e:
            logger.error(f"[Background] Subtitle extraction failed for job {job_id}: {e}", exc_info=True)
            # Mark as skipped on error (non-critical)
            try:
                job = await UploadJob.find_one(UploadJob.job_id == job_id)
                if job:
                    job.stages["subtitle_extraction"] = "skipped"
                    await job.save()
                    await self._broadcast_queue_update()
            except:
                pass


# Global upload service instance
upload_service = UploadService()
