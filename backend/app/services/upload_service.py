"""
Upload Service
Handles file upload queue management, processing, and GCS uploads.
"""

import os
import asyncio
import hashlib
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
        skip_duplicate_check: bool = False,
    ) -> UploadJob:
        """
        Add a new file to the upload queue.
        
        Args:
            source_path: Absolute path to the file
            content_type: Type of content (movie, podcast, etc.)
            metadata: Additional metadata
            user_id: ID of user creating the upload
            skip_duplicate_check: If True, skip hash calculation during enqueue (will check during processing)
            
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
        
        # Calculate SHA256 hash for duplicate detection (only if not skipping)
        file_hash = None
        if not skip_duplicate_check:
            logger.info(f"Calculating hash for {path.name}...")
            file_hash = await self._calculate_file_hash(str(path.absolute()))
            logger.info(f"File hash: {file_hash[:16]}...")
        
        # Check for duplicates (only if hash was calculated)
        if file_hash is not None:
            from motor.motor_asyncio import AsyncIOMotorClient
            client = AsyncIOMotorClient(settings.MONGODB_URL)
            db = client[settings.MONGODB_DB_NAME]
            
            existing_content = await db.content.find_one({'file_hash': file_hash})
            if existing_content:
                logger.warning(f"Duplicate file detected: {path.name} (hash: {file_hash[:16]}...)")
                raise ValueError(f"File already exists in library: {existing_content.get('title', path.name)}")
            
            # Check if there's already a pending/processing job with the same hash
            from beanie.operators import In
            existing_job = await UploadJob.find_one(
                UploadJob.file_hash == file_hash,
                In(UploadJob.status, [UploadStatus.QUEUED, UploadStatus.PROCESSING, UploadStatus.UPLOADING])
            )
            if existing_job:
                logger.warning(f"File already queued for upload: {path.name} (job: {existing_job.job_id})")
                raise ValueError(f"File already in upload queue: {existing_job.filename}")
        
        # Create job
        job = UploadJob(
            job_id=str(uuid4()),
            type=content_type,
            source_path=str(path.absolute()),
            filename=path.name,
            file_size=file_size,
            file_hash=file_hash,
            status=UploadStatus.QUEUED,
            metadata=metadata or {},
            created_by=user_id,
        )
        
        await job.insert()
        logger.info(f"✅ Enqueued upload job {job.job_id}: {path.name}")
        
        # Broadcast update
        await self._broadcast_queue_update()
        
        # Start processing if not already running
        asyncio.create_task(self.process_queue())
        
        return job

    async def enqueue_multiple(
        self,
        file_paths: List[str],
        content_type: ContentType,
        user_id: Optional[str] = None,
    ) -> List[UploadJob]:
        """Enqueue multiple files at once"""
        jobs = []
        for path in file_paths:
            try:
                job = await self.enqueue_upload(path, content_type, user_id=user_id)
                jobs.append(job)
            except Exception as e:
                logger.error(f"Failed to enqueue {path}: {e}")
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
                    job.progress = 5.0  # Show some progress during hash calculation
                    await job.save()
                    await self._broadcast_queue_update()
                    
                    logger.info(f"📊 Calculating hash in background for {job.filename}...")
                job.file_hash = await self._calculate_file_hash(job.source_path)
                    logger.info(f"✓ Hash calculated: {job.file_hash[:16]}... (will be stored in DB)")
                    
                    job.stages["hash_calculation"] = "completed"
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
            job.progress = 15.0
            await job.save()
            await self._broadcast_queue_update()
            
            if job.type == ContentType.MOVIE:
                metadata = await self._extract_movie_metadata(job)
            elif job.type == ContentType.PODCAST:
                metadata = await self._extract_podcast_metadata(job)
            else:
                metadata = {}
            
            job.metadata.update(metadata)
            job.stages["metadata_extraction"] = "completed"
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
            await job.save()
            await self._broadcast_queue_update()
            
            destination_url = await self._upload_to_gcs(job)
            
            if not destination_url:
                raise Exception("GCS upload failed")
            
            job.destination_url = destination_url
            job.stages["gcs_upload"] = "completed"
            await job.save()
            
            # Stage 3: Create content entry in database
            job.stages["database_insert"] = "in_progress"
            job.progress = 96.0
            await job.save()
            await self._broadcast_queue_update()
            
            await self._create_content_entry(job)
            
            job.stages["database_insert"] = "completed"
            job.progress = 98.0
            await job.save()
            await self._broadcast_queue_update()
            
            # Mark as completed
            job.status = UploadStatus.COMPLETED
            job.progress = 100.0
            job.completed_at = datetime.utcnow()
            await job.save()
            await self._broadcast_queue_update()
            
            logger.info(f"Job {job.job_id} completed successfully")
            
            # Trigger background subtitle extraction if scheduled
            if job.stages.get("subtitle_extraction") == "scheduled" and job.metadata.get("local_source_path"):
                asyncio.create_task(self._extract_subtitles_background(
                    job.metadata.get("content_id"),
                    job.metadata.get("local_source_path"),
                    job.job_id
                ))
            
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
            elif job.type == ContentType.PODCAST:
                await self._create_podcast_episode_entry(job)
            # Add other content types as needed
            
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
        # Count by status
        all_jobs = await UploadJob.find_all().to_list()
        
        stats = QueueStats(
            total_jobs=len(all_jobs),
            queued=sum(1 for j in all_jobs if j.status == UploadStatus.QUEUED),
            processing=sum(1 for j in all_jobs if j.status in [UploadStatus.PROCESSING, UploadStatus.UPLOADING]),
            completed=sum(1 for j in all_jobs if j.status == UploadStatus.COMPLETED),
            failed=sum(1 for j in all_jobs if j.status == UploadStatus.FAILED),
            cancelled=sum(1 for j in all_jobs if j.status == UploadStatus.CANCELLED),
            total_size_bytes=sum(j.file_size or 0 for j in all_jobs),
            uploaded_bytes=sum(j.bytes_uploaded for j in all_jobs),
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

    async def _broadcast_queue_update(self):
        """Broadcast queue update via WebSocket"""
        if self._websocket_callback:
            try:
                stats = await self.get_queue_stats()
                active_job = await self.get_active_job()
                queue = await self.get_queue()
                recent = await self.get_recent_completed(5)
                
                # Add queue pause info to the broadcast
                message = {
                    "type": "queue_update",
                    "stats": stats.dict(),
                    "active_job": UploadJobResponse.from_orm(active_job).dict() if active_job else None,
                    "queue": [UploadJobResponse.from_orm(j).dict() for j in queue],
                    "recent_completed": [UploadJobResponse.from_orm(j).dict() for j in recent],
                    "queue_paused": self._queue_paused,
                    "pause_reason": self._pause_reason,
                }
                
                await self._websocket_callback(message)
            except Exception as e:
                logger.error(f"Failed to broadcast queue update: {e}")

    async def _extract_subtitles_background(self, content_id: str, local_path: str, job_id: str):
        """
        Extract subtitles in background without blocking the upload queue.
        Runs as a separate async task after upload completes.
        """
        try:
            logger.info(f"[Background] Starting subtitle extraction for job {job_id}")
            
            # Check if file still exists
            if not os.path.exists(local_path):
                logger.warning(f"[Background] Local file no longer exists: {local_path}")
                return
            
            from app.services.ffmpeg_service import FFmpegService
            from app.models.content import Content, SubtitleTrackDoc, SubtitleCueModel
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
                    subtitle_track = SubtitleTrackDoc(
                        content_id=content_id,
                        language=sub_data.get("language", "und"),
                        format=sub_data.get("format", "srt"),
                        is_embedded=True,
                        source="embedded",
                        cues=[SubtitleCueModel(
                            start=cue["start"],
                            end=cue["end"],
                            text=cue["text"]
                        ) for cue in parse_srt(sub_data["content"]).cues]
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
                content.available_subtitles = sorted(list(existing_languages))
                await content.save()
                
            logger.info(f"[Background] Saved {saved_count} subtitle tracks for job {job_id}")
            
        except Exception as e:
            logger.error(f"[Background] Subtitle extraction failed for job {job_id}: {e}", exc_info=True)


# Global upload service instance
upload_service = UploadService()
