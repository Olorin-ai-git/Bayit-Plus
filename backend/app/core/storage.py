"""
Storage abstraction layer
Supports both local file storage and AWS S3
"""

import os
from pathlib import Path
from uuid import uuid4
from typing import Optional, Tuple
from io import BytesIO

from fastapi import UploadFile
from PIL import Image

from app.core.config import settings


class StorageProvider:
    """Abstract base for storage providers"""

    async def upload_image(self, file: UploadFile, image_type: str) -> str:
        """Upload image and return URL/path"""
        raise NotImplementedError

    async def validate_url(self, url: str) -> bool:
        """Validate that a URL is accessible"""
        raise NotImplementedError

    def get_presigned_url(self, filename: str, content_type: str) -> dict:
        """Get presigned URL for direct upload (S3 only)"""
        raise NotImplementedError

    async def delete_file(self, url: str) -> bool:
        """Delete file from storage. Returns True if successful"""
        raise NotImplementedError


class LocalStorageProvider(StorageProvider):
    """Local file system storage"""

    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def upload_image(self, file: UploadFile, image_type: str) -> str:
        """Upload image locally with optimization"""
        # Validate file type
        allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        if file.content_type not in allowed_types:
            raise ValueError(f"Invalid image type: {file.content_type}")

        # Read file content
        content = await file.read()

        # Validate size (5MB max)
        if len(content) > 5 * 1024 * 1024:
            raise ValueError("Image too large (max 5MB)")

        # Determine if we should preserve transparency (PNG/WebP)
        preserve_alpha = file.content_type in {"image/png", "image/webp"}

        # Optimize image
        optimized, output_format = await self._optimize_image(content, preserve_alpha)

        # Generate filename with correct extension
        if output_format == "PNG":
            file_ext = ".png"
        elif output_format == "WEBP":
            file_ext = ".webp"
        else:
            file_ext = ".jpg"
        filename = f"{uuid4()}{file_ext}"

        # Create type directory
        type_dir = self.upload_dir / image_type
        type_dir.mkdir(parents=True, exist_ok=True)

        # Save file
        file_path = type_dir / filename
        with open(file_path, "wb") as f:
            f.write(optimized)

        # Return relative path for serving
        return f"/uploads/{image_type}/{filename}"

    async def _optimize_image(self, image_bytes: bytes, preserve_alpha: bool = False) -> Tuple[bytes, str]:
        """Resize and compress image using Pillow. Returns (bytes, format)"""
        try:
            img = Image.open(BytesIO(image_bytes))
            original_format = img.format or "JPEG"

            # Resize if too large (max 1920px width)
            max_width = 1920
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

            output = BytesIO()

            # Check if image has transparency
            has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)

            if preserve_alpha and has_alpha:
                # Keep PNG format to preserve transparency
                if img.mode == "P":
                    img = img.convert("RGBA")
                img.save(output, format="PNG", optimize=True)
                return output.getvalue(), "PNG"
            else:
                # Convert to RGB and save as JPEG for better compression
                if img.mode in ("RGBA", "LA", "P"):
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    if img.mode == "P":
                        img = img.convert("RGBA")
                    if img.mode in ("RGBA", "LA"):
                        background.paste(img, mask=img.split()[-1])
                    else:
                        background.paste(img)
                    img = background
                elif img.mode != "RGB":
                    img = img.convert("RGB")

                img.save(output, format="JPEG", quality=85, optimize=True)
                return output.getvalue(), "JPEG"

        except Exception as e:
            # If optimization fails, return original
            print(f"Image optimization failed: {e}")
            return image_bytes, "JPEG"

    async def validate_url(self, url: str) -> bool:
        """Validate URL (for local, just check if it's a valid format)"""
        try:
            # Basic URL validation
            return url.startswith("http://") or url.startswith("https://") or url.startswith("/uploads/")
        except Exception:
            return False

    def get_presigned_url(self, filename: str, content_type: str) -> dict:
        """Not applicable for local storage"""
        raise NotImplementedError("Presigned URLs not supported for local storage")

    async def delete_file(self, url: str) -> bool:
        """Delete file from local storage"""
        try:
            if url.startswith("/uploads/"):
                file_path = self.upload_dir / url.replace("/uploads/", "")
            elif url.startswith("http"):
                file_path = self.upload_dir / url.split("/uploads/")[-1]
            else:
                file_path = self.upload_dir / url

            if file_path.exists() and file_path.is_file():
                file_path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Failed to delete local file {url}: {e}")
            return False


class S3StorageProvider(StorageProvider):
    """AWS S3 storage provider"""

    def __init__(self):
        try:
            import boto3
            from botocore.exceptions import ClientError
            self.boto3 = boto3
            self.ClientError = ClientError
            self.s3_client = boto3.client(
                "s3",
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION,
            )
            self.bucket = settings.AWS_S3_BUCKET
            self.cdn_base = settings.CDN_BASE_URL
        except ImportError:
            raise ImportError("boto3 required for S3 storage. Install with: pip install boto3")
        except Exception as e:
            raise ValueError(f"Failed to initialize S3 client: {e}")

    async def upload_image(self, file: UploadFile, image_type: str) -> str:
        """Upload image to S3 with optimization"""
        # Validate file type
        allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        if file.content_type not in allowed_types:
            raise ValueError(f"Invalid image type: {file.content_type}")

        # Read file content
        content = await file.read()

        # Validate size (5MB max)
        if len(content) > 5 * 1024 * 1024:
            raise ValueError("Image too large (max 5MB)")

        # Determine if we should preserve transparency (PNG/WebP)
        preserve_alpha = file.content_type in {"image/png", "image/webp"}

        # Optimize image
        optimized, output_format = await self._optimize_image(content, preserve_alpha)

        # Generate key with correct extension
        if output_format == "PNG":
            ext = ".png"
            content_type = "image/png"
        elif output_format == "WEBP":
            ext = ".webp"
            content_type = "image/webp"
        else:
            ext = ".jpg"
            content_type = "image/jpeg"

        filename = f"{uuid4()}{ext}"
        key = f"images/{image_type}/{filename}"

        try:
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=optimized,
                ContentType=content_type,
                CacheControl="max-age=31536000",  # 1 year
            )

            # Return URL
            if self.cdn_base:
                return f"{self.cdn_base}/{key}"
            else:
                return f"https://{self.bucket}.s3.{settings.AWS_S3_REGION}.amazonaws.com/{key}"
        except self.ClientError as e:
            raise ValueError(f"S3 upload failed: {e}")

    async def _optimize_image(self, image_bytes: bytes, preserve_alpha: bool = False) -> Tuple[bytes, str]:
        """Resize and compress image using Pillow. Returns (bytes, format)"""
        try:
            img = Image.open(BytesIO(image_bytes))

            # Resize if too large (max 1920px width)
            max_width = 1920
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

            output = BytesIO()

            # Check if image has transparency
            has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)

            if preserve_alpha and has_alpha:
                # Keep PNG format to preserve transparency
                if img.mode == "P":
                    img = img.convert("RGBA")
                img.save(output, format="PNG", optimize=True)
                return output.getvalue(), "PNG"
            else:
                # Convert to RGB and save as JPEG for better compression
                if img.mode in ("RGBA", "LA", "P"):
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    if img.mode == "P":
                        img = img.convert("RGBA")
                    if img.mode in ("RGBA", "LA"):
                        background.paste(img, mask=img.split()[-1])
                    else:
                        background.paste(img)
                    img = background
                elif img.mode != "RGB":
                    img = img.convert("RGB")

                img.save(output, format="JPEG", quality=85, optimize=True)
                return output.getvalue(), "JPEG"

        except Exception as e:
            print(f"Image optimization failed: {e}")
            return image_bytes, "JPEG"

    async def validate_url(self, url: str) -> bool:
        """Validate that URL is accessible"""
        import httpx

        try:
            async with httpx.AsyncClient() as client:
                response = await client.head(url, timeout=5)
                return response.status_code < 400
        except Exception:
            return False

    def get_presigned_url(self, filename: str, content_type: str) -> dict:
        """Generate presigned POST URL for direct browser upload"""
        key = f"uploads/{uuid4()}/{filename}"

        try:
            # Generate presigned POST
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket,
                Key=key,
                Fields={"acl": "public-read", "Content-Type": content_type},
                Conditions=[
                    {"acl": "public-read"},
                    {"Content-Type": content_type},
                    ["content-length-range", 0, 100 * 1024 * 1024],  # 100MB max
                ],
                ExpiresIn=3600,  # 1 hour
            )

            return {
                "url": response["url"],
                "fields": response["fields"],
                "key": key,
            }
        except self.ClientError as e:
            raise ValueError(f"Failed to generate presigned URL: {e}")

    async def delete_file(self, url: str) -> bool:
        """Delete file from S3"""
        try:
            if settings.CDN_BASE_URL and url.startswith(settings.CDN_BASE_URL):
                key = url.replace(settings.CDN_BASE_URL + "/", "")
            elif url.startswith(f"https://s3.{settings.AWS_S3_REGION}.amazonaws.com/{self.bucket}/"):
                key = url.split(f"/{self.bucket}/")[1]
            elif url.startswith("https://") or url.startswith("http://"):
                key = url.split("/")[-2] + "/" + url.split("/")[-1]
            else:
                key = url

            self.s3_client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except self.ClientError as e:
            print(f"Failed to delete S3 file {url}: {e}")
            return False


class GCSStorageProvider(StorageProvider):
    """Google Cloud Storage provider"""

    def __init__(self):
        try:
            from google.cloud import storage
            from google.api_core import exceptions
            import datetime
            import os

            self.storage = storage
            self.exceptions = exceptions
            self.datetime = datetime

            # Set credentials path if provided (for local development)
            if settings.GOOGLE_APPLICATION_CREDENTIALS:
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = settings.GOOGLE_APPLICATION_CREDENTIALS

            # Client auto-authenticates:
            # - In Cloud Run: via metadata server
            # - Locally: via GOOGLE_APPLICATION_CREDENTIALS env var
            self.client = storage.Client(project=settings.GCS_PROJECT_ID or None)
            self.bucket_name = settings.GCS_BUCKET_NAME
            self.bucket = self.client.bucket(self.bucket_name)
            self.cdn_base = settings.CDN_BASE_URL

        except ImportError:
            raise ImportError(
                "google-cloud-storage required for GCS. "
                "Install with: pip install google-cloud-storage"
            )
        except Exception as e:
            raise ValueError(f"Failed to initialize GCS client: {e}")

    async def upload_image(self, file: UploadFile, image_type: str) -> str:
        """Upload image to GCS with optimization"""
        # Validate file type
        allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        if file.content_type not in allowed_types:
            raise ValueError(f"Invalid image type: {file.content_type}")

        # Read and validate size
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:  # 5MB
            raise ValueError("Image too large (max 5MB)")

        # Determine if we should preserve transparency (PNG/WebP)
        preserve_alpha = file.content_type in {"image/png", "image/webp"}

        # Optimize image
        optimized, output_format = await self._optimize_image(content, preserve_alpha)

        # Generate blob path with correct extension
        if output_format == "PNG":
            ext = ".png"
            content_type = "image/png"
        elif output_format == "WEBP":
            ext = ".webp"
            content_type = "image/webp"
        else:
            ext = ".jpg"
            content_type = "image/jpeg"

        filename = f"{uuid4()}{ext}"
        blob_name = f"images/{image_type}/{filename}"

        try:
            # Create blob and upload
            blob = self.bucket.blob(blob_name)
            blob.upload_from_string(
                optimized,
                content_type=content_type,
                timeout=60
            )

            # Set cache control and make public
            blob.cache_control = "public, max-age=31536000"  # 1 year
            blob.make_public()
            blob.patch()

            # Return URL
            if self.cdn_base:
                return f"{self.cdn_base}/{blob_name}"
            else:
                return blob.public_url

        except self.exceptions.GoogleAPIError as e:
            raise ValueError(f"GCS upload failed: {e}")

    async def _optimize_image(self, image_bytes: bytes, preserve_alpha: bool = False) -> Tuple[bytes, str]:
        """Resize and compress image using Pillow. Returns (bytes, format)"""
        try:
            img = Image.open(BytesIO(image_bytes))

            # Resize if too large (max 1920px width)
            max_width = 1920
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

            output = BytesIO()

            # Check if image has transparency
            has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)

            if preserve_alpha and has_alpha:
                # Keep PNG format to preserve transparency
                if img.mode == "P":
                    img = img.convert("RGBA")
                img.save(output, format="PNG", optimize=True)
                return output.getvalue(), "PNG"
            else:
                # Convert to RGB and save as JPEG for better compression
                if img.mode in ("RGBA", "LA", "P"):
                    background = Image.new("RGB", img.size, (255, 255, 255))
                    if img.mode == "P":
                        img = img.convert("RGBA")
                    if img.mode in ("RGBA", "LA"):
                        background.paste(img, mask=img.split()[-1])
                    else:
                        background.paste(img)
                    img = background
                elif img.mode != "RGB":
                    img = img.convert("RGB")

                img.save(output, format="JPEG", quality=85, optimize=True)
                return output.getvalue(), "JPEG"

        except Exception as e:
            print(f"Image optimization failed: {e}")
            return image_bytes, "JPEG"

    async def validate_url(self, url: str) -> bool:
        """Validate URL accessibility"""
        import httpx
        try:
            async with httpx.AsyncClient() as client:
                response = await client.head(url, timeout=5)
                return response.status_code < 400
        except Exception:
            return False

    def get_presigned_url(self, filename: str, content_type: str) -> dict:
        """Generate signed URL for direct browser upload"""
        blob_name = f"uploads/{uuid4()}/{filename}"
        blob = self.bucket.blob(blob_name)

        try:
            # Generate signed upload URL (valid for 1 hour)
            url = blob.generate_signed_url(
                version="v4",
                expiration=self.datetime.timedelta(hours=1),
                method="PUT",
                content_type=content_type,
            )

            return {
                "url": url,
                "method": "PUT",
                "blob_name": blob_name,
                "headers": {
                    "Content-Type": content_type,
                }
            }
        except Exception as e:
            raise ValueError(f"Failed to generate signed URL: {e}")

    async def delete_file(self, url: str) -> bool:
        """Delete file from GCS"""
        try:
            if settings.CDN_BASE_URL and url.startswith(settings.CDN_BASE_URL):
                blob_name = url.replace(settings.CDN_BASE_URL + "/", "")
            elif url.startswith(f"https://storage.googleapis.com/{self.bucket.name}/"):
                blob_name = url.split(f"/{self.bucket.name}/")[1]
            elif url.startswith("https://") or url.startswith("http://"):
                blob_name = "/".join(url.split("/")[3:])
            else:
                blob_name = url

            blob = self.bucket.blob(blob_name)
            blob.delete()
            return True
        except self.exceptions.NotFound:
            print(f"GCS file not found: {url}")
            return False
        except Exception as e:
            print(f"Failed to delete GCS file {url}: {e}")
            return False


def get_storage_provider() -> StorageProvider:
    """Get configured storage provider"""
    import logging
    logger = logging.getLogger(__name__)

    if settings.STORAGE_TYPE == "gcs":
        try:
            return GCSStorageProvider()
        except Exception as e:
            logger.warning(
                f"⚠️  Failed to initialize GCS storage: {e}\n"
                f"Falling back to local storage. "
                f"For local development, set STORAGE_TYPE=local in your .env file."
            )
            return LocalStorageProvider(settings.UPLOAD_DIR)
    elif settings.STORAGE_TYPE == "s3":
        try:
            return S3StorageProvider()
        except Exception as e:
            logger.warning(
                f"⚠️  Failed to initialize S3 storage: {e}\n"
                f"Falling back to local storage. "
                f"For local development, set STORAGE_TYPE=local in your .env file."
            )
            return LocalStorageProvider(settings.UPLOAD_DIR)
    else:
        return LocalStorageProvider(settings.UPLOAD_DIR)


# Default instance
storage = get_storage_provider()
