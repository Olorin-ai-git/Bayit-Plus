from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from google.cloud import storage
import base64
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/proxy/media/{encoded_url}")
async def proxy_media(encoded_url: str):
    """Proxy GCS media files for authenticated access."""
    try:
        # Decode the base64-encoded GCS URL
        gcs_url = base64.urlsafe_b64decode(encoded_url.encode()).decode()
        
        if "storage.googleapis.com" not in gcs_url:
            raise HTTPException(status_code=400, detail="Invalid URL")
        
        # Extract bucket and blob path
        parts = gcs_url.replace("https://storage.googleapis.com/", "").split("/", 1)
        if len(parts) != 2:
            raise HTTPException(status_code=400, detail="Invalid GCS URL format")
        
        bucket_name, blob_name = parts
        
        # Get file from GCS
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        if not blob.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        # Stream the file
        def generate():
            # Download in chunks to avoid memory issues
            chunk_size = 1024 * 1024  # 1MB chunks
            with blob.open("rb") as f:
                while True:
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    yield chunk
        
        # Determine content type
        content_type = blob.content_type or "video/mp4"
        
        return StreamingResponse(
            generate(),
            media_type=content_type,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(blob.size),
            }
        )
        
    except Exception as e:
        logger.error(f"Error proxying media: {e}")
        raise HTTPException(status_code=500, detail="Failed to proxy media file")
