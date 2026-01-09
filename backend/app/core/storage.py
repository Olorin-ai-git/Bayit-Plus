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

        # Optimize image
        optimized = await self._optimize_image(content)

        # Generate filename
        file_ext = Path(file.filename).suffix.lower()
        if not file_ext:
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

    async def _optimize_image(self, image_bytes: bytes) -> bytes:
        """Resize and compress image using Pillow"""
        try:
            img = Image.open(BytesIO(image_bytes))

            # Resize if too large (max 1920px width)
            max_width = 1920
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

            # Convert RGBA to RGB if needed
            if img.mode in ("RGBA", "LA", "P"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
                img = background

            # Save optimized
            output = BytesIO()
            img.save(output, format="JPEG", quality=85, optimize=True)
            return output.getvalue()
        except Exception as e:
            # If optimization fails, return original
            print(f"Image optimization failed: {e}")
            return image_bytes

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

        # Optimize image
        optimized = await self._optimize_image(content)

        # Generate key
        filename = f"{uuid4()}.jpg"
        key = f"images/{image_type}/{filename}"

        try:
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=optimized,
                ContentType="image/jpeg",
                CacheControl="max-age=31536000",  # 1 year
            )

            # Return URL
            if self.cdn_base:
                return f"{self.cdn_base}/{key}"
            else:
                return f"https://{self.bucket}.s3.{settings.AWS_S3_REGION}.amazonaws.com/{key}"
        except self.ClientError as e:
            raise ValueError(f"S3 upload failed: {e}")

    async def _optimize_image(self, image_bytes: bytes) -> bytes:
        """Resize and compress image using Pillow"""
        try:
            img = Image.open(BytesIO(image_bytes))

            # Resize if too large (max 1920px width)
            max_width = 1920
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

            # Convert RGBA to RGB if needed
            if img.mode in ("RGBA", "LA", "P"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
                img = background

            # Save optimized
            output = BytesIO()
            img.save(output, format="JPEG", quality=85, optimize=True)
            return output.getvalue()
        except Exception as e:
            print(f"Image optimization failed: {e}")
            return image_bytes

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


def get_storage_provider() -> StorageProvider:
    """Get configured storage provider"""
    if settings.STORAGE_TYPE == "s3":
        return S3StorageProvider()
    else:
        return LocalStorageProvider(settings.UPLOAD_DIR)


# Default instance
storage = get_storage_provider()
