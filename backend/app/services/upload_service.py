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

    def set_websocket_callback(self, callback):
        """Set callback function for WebSocket broadcasts"""
        self._websocket_callback = callback

    async def _get_gcs_client(self) -> gcs_storage.Client:
        """Get or create GCS client"""
        if self._gcs_client is None:
            self._gcs_client = gcs_storage.Client()
        return self._gcs_client

    async def enqueue_upload(
        self,
        source_path: str,
        content_type: ContentType,
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
    ) -> UploadJob:
        """
        Add a new file to the upload queue.
        
        Args:
            source_path: Absolute path to the file
            content_type: Type of content (movie, podcast, etc.)
            metadata: Additional metadata
            user_id: ID of user creating the upload
            
        Returns:
            Created UploadJob
        """
        path = Path(source_path)
        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {source_path}")
        
        # Get file size
        file_size = path.stat().st_size
        
        # Create job
        job = UploadJob(
            job_id=str(uuid4()),
            type=content_type,
            source_path=str(path.absolute()),
            filename=path.name,
            file_size=file_size,
            status=UploadStatus.QUEUED,
            metadata=metadata or {},
            created_by=user_id,
        )
        
        await job.insert()
        logger.info(f"Enqueued upload job {job.job_id}: {path.name}")
        
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
            self.processing = True

        try:
            while True:
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
            
            # Stage 1: Extract metadata
            job.stages["metadata_extraction"] = "in_progress"
            await job.save()
            
            if job.type == ContentType.MOVIE:
                metadata = await self._extract_movie_metadata(job)
            elif job.type == ContentType.PODCAST_EPISODE:
                metadata = await self._extract_podcast_metadata(job)
            else:
                metadata = {}
            
            job.metadata.update(metadata)
            job.stages["metadata_extraction"] = "completed"
            await job.save()
            
            # Stage 1.5: Extract subtitles from local file (for video content)
            if job.type == ContentType.MOVIE and os.path.exists(job.source_path):
                job.stages["subtitle_extraction"] = "in_progress"
                await job.save()
                
                try:
                    logger.info(f"Extracting subtitles from local file: {job.source_path}")
                    from app.services.ffmpeg_service import FFmpegService
                    ffmpeg = FFmpegService()
                    
                    # Extract subtitles (only required languages: en, he, es)
                    extracted_subs = await ffmpeg.extract_all_subtitles(
                        job.source_path,  # Use local file path for fast extraction
                        languages=['en', 'he', 'es'],
                        max_parallel=3
                    )
                    
                    # Store extracted subtitles in job metadata for later saving
                    job.metadata["extracted_subtitles"] = extracted_subs
                    job.stages["subtitle_extraction"] = "completed"
                    logger.info(f"Extracted {len(extracted_subs)} subtitle tracks from local file")
                    
                except Exception as e:
                    logger.warning(f"Subtitle extraction failed (non-critical): {str(e)}")
                    job.stages["subtitle_extraction"] = "failed"
                    # Don't fail the entire job if subtitle extraction fails
                
                await job.save()
            
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
            await job.save()
            
            await self._create_content_entry(job)
            
            job.stages["database_insert"] = "completed"
            
            # Mark as completed
            job.status = UploadStatus.COMPLETED
            job.progress = 100.0
            job.completed_at = datetime.utcnow()
            await job.save()
            
            logger.info(f"Job {job.job_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Job {job.job_id} failed: {e}", exc_info=True)
            
            job.status = UploadStatus.FAILED
            job.error_message = str(e)
            job.retry_count += 1
            await job.save()
            
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
            file_hash = hashlib.md5(job.source_path.encode()).hexdigest()[:8]
            filename = Path(job.filename).name
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
            chunk_size = 5 * 1024 * 1024  # 5MB chunks
            
            with open(job.source_path, 'rb') as file_obj:
                blob.upload_from_file(
                    file_obj,
                    content_type=content_type,
                    size=job.file_size,
                )
            
            # Update progress (simplified - real implementation would track during upload)
            job.progress = 100.0
            job.bytes_uploaded = job.file_size or 0
            
            # Calculate upload speed
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            if elapsed > 0:
                job.upload_speed = (job.file_size or 0) / elapsed
            
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
            elif job.type == ContentType.PODCAST_EPISODE:
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
        )
        
        await content.insert()
        logger.info(f"Created movie content: {content.title}")
        
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

    async def _broadcast_queue_update(self):
        """Broadcast queue update via WebSocket"""
        if self._websocket_callback:
            try:
                stats = await self.get_queue_stats()
                active_job = await self.get_active_job()
                queue = await self.get_queue()
                recent = await self.get_recent_completed(5)
                
                await self._websocket_callback({
                    "type": "queue_update",
                    "stats": stats.dict(),
                    "active_job": UploadJobResponse.from_orm(active_job).dict() if active_job else None,
                    "queue": [UploadJobResponse.from_orm(j).dict() for j in queue],
                    "recent_completed": [UploadJobResponse.from_orm(j).dict() for j in recent],
                })
            except Exception as e:
                logger.error(f"Failed to broadcast queue update: {e}")


# Global upload service instance
upload_service = UploadService()
