# S3 Integration Guide for Production

## Overview
This guide covers setting up Amazon S3 (or compatible services) for image storage in production. The system currently uses local file storage but is designed to work seamlessly with S3.

---

## Prerequisites

### AWS Account Setup
1. Create AWS account at https://aws.amazon.com
2. Create IAM user for application (not root)
3. Generate access key and secret key

### Compatible Services
This guide works with any S3-compatible service:
- **AWS S3**: Official Amazon storage
- **DigitalOcean Spaces**: $5/month for 250GB
- **Backblaze B2**: Pay-as-you-go ($0.006/GB)
- **MinIO**: Self-hosted open-source
- **Wasabi**: Fast S3-compatible storage

---

## Part 1: AWS S3 Setup

### Step 1: Create S3 Bucket

```bash
# Using AWS CLI
aws s3 mb s3://bayit-plus-media --region us-east-1

# Or use AWS Console:
# 1. Go to S3 service
# 2. Click "Create bucket"
# 3. Name: bayit-plus-media
# 4. Region: us-east-1 (or your preferred region)
# 5. Block public access: ON (recommended)
```

### Step 2: Create IAM User

```bash
# Create user
aws iam create-user --user-name bayit-plus-app

# Create access key
aws iam create-access-key --user-name bayit-plus-app
```

**Keep the Access Key ID and Secret Access Key safe!**

### Step 3: Create S3 Policy

Create a file `s3-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::bayit-plus-media",
        "arn:aws:s3:::bayit-plus-media-new/*"
      ]
    }
  ]
}
```

### Step 4: Attach Policy to User

```bash
# Create inline policy
aws iam put-user-policy \
  --user-name bayit-plus-app \
  --policy-name bayit-plus-s3-policy \
  --policy-document file://s3-policy.json

# Verify
aws iam list-user-policies --user-name bayit-plus-app
```

---

## Part 2: Backend Configuration

### Step 1: Install Dependencies

```bash
cd backend
poetry add boto3
```

### Step 2: Update Environment Variables

Create `.env.production`:

```env
# Storage Configuration
STORAGE_TYPE=s3

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET=bayit-plus-media
AWS_S3_REGION=us-east-1

# Optional: Use custom S3-compatible endpoint
AWS_S3_ENDPOINT_URL=https://s3.amazonaws.com

# Optional: CDN Configuration
CDN_BASE_URL=https://cdn.example.com
```

### Step 3: Update config.py

The storage type is already configured in `app/core/config.py`. Verify it reads from environment:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Storage Configuration
    STORAGE_TYPE: str = "local"  # or "s3"
    UPLOAD_DIR: str = "uploads"

    # AWS S3 Configuration
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: Optional[str] = None
    AWS_S3_REGION: str = "us-east-1"
    AWS_S3_ENDPOINT_URL: Optional[str] = None

    # CDN Configuration
    CDN_BASE_URL: Optional[str] = None

    class Config:
        env_file = ".env"
```

### Step 4: Verify storage.py Implementation

The `app/core/storage.py` file should have both implementations:

```python
from abc import ABC, abstractmethod
from typing import Optional
import boto3
from pathlib import Path

class StorageBackend(ABC):
    @abstractmethod
    async def save_image(self, file_path: str, file_content: bytes) -> str:
        """Save image and return URL"""
        pass

    @abstractmethod
    async def delete_image(self, file_path: str) -> bool:
        """Delete image from storage"""
        pass

    @abstractmethod
    def get_url(self, file_path: str) -> str:
        """Get public URL for image"""
        pass


class S3Storage(StorageBackend):
    def __init__(self, access_key: str, secret_key: str,
                 bucket: str, region: str, endpoint_url: Optional[str] = None):
        self.bucket = bucket
        self.client = boto3.client(
            's3',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            endpoint_url=endpoint_url
        )

    async def save_image(self, file_path: str, file_content: bytes) -> str:
        """Upload image to S3"""
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=file_path,
                Body=file_content,
                ContentType='image/jpeg'  # or detect from file extension
            )
            return self.get_url(file_path)
        except Exception as e:
            logger.error(f"S3 upload failed: {str(e)}")
            raise

    async def delete_image(self, file_path: str) -> bool:
        """Delete image from S3"""
        try:
            self.client.delete_object(Bucket=self.bucket, Key=file_path)
            return True
        except Exception as e:
            logger.error(f"S3 delete failed: {str(e)}")
            return False

    def get_url(self, file_path: str) -> str:
        """Generate public URL"""
        if settings.CDN_BASE_URL:
            return f"{settings.CDN_BASE_URL}/{file_path}"
        return f"https://{self.bucket}.s3.amazonaws.com/{file_path}"
```

### Step 5: Update admin_uploads.py

The upload endpoint should use the storage backend:

```python
@router.post("/admin/uploads/image")
async def upload_image(file: UploadFile, type: str = Query(...)):
    """Upload image to storage"""

    if not file.filename:
        raise HTTPException(400, "No file provided")

    if not file.content_type.startswith('image/'):
        raise HTTPException(400, "File must be an image")

    # Read file
    content = await file.read()

    # Validate size (max 5MB)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(413, "File too large (max 5MB)")

    # Generate unique filename
    import uuid
    ext = Path(file.filename).suffix
    unique_name = f"{type}/{uuid.uuid4()}{ext}"

    # Save to storage
    storage = get_storage()
    try:
        url = await storage.save_image(unique_name, content)
        return {"url": url}
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(500, "Upload failed")
```

---

## Part 3: CDN Setup (Optional)

### Using CloudFront (AWS)

#### Step 1: Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
  --origin-domain-name bayit-plus-media.s3.amazonaws.com \
  --default-root-object index.html \
  --enabled
```

Or use AWS Console:
1. Go to CloudFront
2. Create distribution
3. Origin domain: bayit-plus-media.s3.amazonaws.com
4. Origin access identity: Create new (for private buckets)
5. Viewer protocol policy: Redirect HTTP to HTTPS
6. Caching: 1 year for images

#### Step 2: Update Environment Variables

```env
CDN_BASE_URL=https://d1234567890.cloudfront.net
```

#### Step 3: Make S3 Bucket Private

```bash
# Block all public access
aws s3api put-public-access-block \
  --bucket bayit-plus-media \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### Using DigitalOcean Spaces

```env
AWS_S3_ENDPOINT_URL=https://nyc3.digitaloceanspaces.com
CDN_BASE_URL=https://bayit-plus-media.nyc3.cdn.digitaloceanspaces.com
```

---

## Part 4: Database Migration (Optional)

If migrating from local storage to S3:

### Step 1: Create Migration Script

Create `backend/scripts/migrate_to_s3.py`:

```python
import asyncio
from pathlib import Path
import boto3
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

async def migrate_images():
    """Migrate local images to S3"""

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB]

    # Initialize S3
    s3 = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION
    )

    # Find all items with local image URLs
    content_collection = db['content']
    items = await content_collection.find({
        "thumbnail": {"$regex": "^/uploads/"}
    }).to_list(None)

    print(f"Found {len(items)} items with local images")

    for item in items:
        thumbnail = item.get('thumbnail')
        if thumbnail:
            # Read local file
            local_path = f".{thumbnail}"
            if Path(local_path).exists():
                with open(local_path, 'rb') as f:
                    content = f.read()

                # Upload to S3
                s3_key = f"images/thumbnails/{item['id']}.jpg"
                s3.put_object(
                    Bucket=settings.AWS_S3_BUCKET,
                    Key=s3_key,
                    Body=content
                )

                # Update database
                new_url = f"https://{settings.AWS_S3_BUCKET}.s3.amazonaws.com/{s3_key}"
                await content_collection.update_one(
                    {"_id": item["_id"]},
                    {"$set": {"thumbnail": new_url}}
                )

                print(f"✓ Migrated {item['id']}")

if __name__ == "__main__":
    asyncio.run(migrate_images())
```

### Step 2: Run Migration

```bash
cd backend
python -m scripts.migrate_to_s3
```

### Step 3: Clean Up Local Storage

```bash
# After verifying migration
rm -rf uploads/
```

---

## Part 5: Monitoring & Maintenance

### CloudWatch Monitoring

```python
import boto3

cloudwatch = boto3.client('cloudwatch')

# Put custom metric
cloudwatch.put_metric_data(
    Namespace='BayitPlus/Content',
    MetricData=[
        {
            'MetricName': 'ImageUploads',
            'Value': 1,
            'Unit': 'Count'
        },
    ]
)
```

### S3 Bucket Monitoring

```bash
# Enable versioning (for rollback)
aws s3api put-bucket-versioning \
  --bucket bayit-plus-media \
  --versioning-configuration Status=Enabled

# Enable logging
aws s3api put-bucket-logging \
  --bucket bayit-plus-media \
  --bucket-logging-status file://logging.json

# Set lifecycle policy (delete old versions after 30 days)
aws s3api put-bucket-lifecycle-configuration \
  --bucket bayit-plus-media \
  --lifecycle-configuration file://lifecycle.json
```

Create `lifecycle.json`:

```json
{
  "Rules": [
    {
      "ID": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    },
    {
      "ID": "DeleteIncompleteUploads",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
```

### Cost Optimization

#### Request Filtering
```python
# Only upload if image changed
import hashlib

def get_file_hash(content: bytes) -> str:
    return hashlib.md5(content).hexdigest()

# Check if image already exists
existing = await db.content.find_one(
    {"image_hash": get_file_hash(content)}
)
if existing:
    return existing['thumbnail']  # Reuse existing
```

#### Image Compression
```python
from PIL import Image
import io

def compress_image(image_content: bytes) -> bytes:
    """Compress image to reduce storage costs"""
    img = Image.open(io.BytesIO(image_content))

    # Convert RGBA to RGB if needed
    if img.mode == 'RGBA':
        rgb_img = Image.new('RGB', img.size, (255, 255, 255))
        rgb_img.paste(img, mask=img.split()[3])
        img = rgb_img

    # Compress
    output = io.BytesIO()
    img.save(output, format='JPEG', quality=85, optimize=True)
    return output.getvalue()
```

---

## Part 6: Troubleshooting

### Common Issues

#### Issue: "NoCredentialsError"
```
Error: Unable to locate credentials
```
**Solution**:
- Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set
- Check environment variables: `echo $AWS_ACCESS_KEY_ID`
- Verify IAM user has S3 permissions

#### Issue: "NoSuchBucket"
```
Error: An error occurred (NoSuchBucket) when calling the PutObject operation
```
**Solution**:
- Verify bucket exists: `aws s3 ls`
- Verify bucket name matches configuration
- Verify correct region

#### Issue: "AccessDenied"
```
Error: An error occurred (AccessDenied) when calling the PutObject operation
```
**Solution**:
- Verify IAM policy includes PutObject action
- Check policy attachment to user
- Verify no bucket policies deny access

#### Issue: Slow Uploads
**Solutions**:
- Enable multipart upload for large files
- Use CloudFront for CDN acceleration
- Use S3 Transfer Acceleration
- Compress images before upload

#### Issue: High Costs
**Solutions**:
- Set S3 Intelligent-Tiering
- Enable versioning cleanup
- Compress images
- Cache at CDN level
- Monitor request patterns

---

## Part 7: Security Best Practices

### Access Control
```bash
# Block public access
aws s3api put-public-access-block \
  --bucket bayit-plus-media \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Use bucket policy to restrict to CloudFront
aws s3api put-bucket-policy --bucket bayit-plus-media \
  --policy file://bucket-policy.json
```

Create `bucket-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity EAXAMPLEID"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bayit-plus-media-new/*"
    }
  ]
}
```

### Encryption
```bash
# Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket bayit-plus-media \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'
```

### Audit Logging
```bash
# Enable S3 access logging
aws s3api put-bucket-logging \
  --bucket bayit-plus-media \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "bayit-plus-logs",
      "TargetPrefix": "s3-access-logs/"
    }
  }'
```

---

## Part 8: Fallback Strategy

### Local Storage Fallback
```python
class HybridStorage(StorageBackend):
    """Use S3 with local fallback"""

    def __init__(self, s3_storage: S3Storage, local_storage: LocalStorage):
        self.s3 = s3_storage
        self.local = local_storage

    async def save_image(self, file_path: str, content: bytes) -> str:
        try:
            # Try S3 first
            return await self.s3.save_image(file_path, content)
        except Exception as e:
            logger.warning(f"S3 upload failed, falling back to local: {e}")
            # Fall back to local storage
            return await self.local.save_image(file_path, content)
```

---

## Deployment Checklist

- [ ] S3 bucket created
- [ ] IAM user created with policy
- [ ] Access keys generated and stored securely
- [ ] Environment variables configured
- [ ] Dependencies installed (boto3)
- [ ] Storage class updated
- [ ] Admin upload endpoints verified
- [ ] Image migration completed (if migrating)
- [ ] CloudFront distribution created (optional)
- [ ] Monitoring configured
- [ ] Lifecycle policies set
- [ ] Encryption enabled
- [ ] Access logging enabled
- [ ] Bucket policy configured
- [ ] Tested in staging environment
- [ ] Disaster recovery plan created

---

## Cost Estimation (AWS)

### Monthly Costs Example (100GB storage, 1M requests)

| Component | Usage | Price |
|-----------|-------|-------|
| S3 Storage | 100 GB | $2.30 |
| S3 Requests (PUT) | 10K | $0.50 |
| S3 Requests (GET) | 990K | $0.04 |
| Data Transfer Out | 50 GB | $4.25 |
| **Total** | | **~$7.09/month** |

With CloudFront CDN:
- Reduces data transfer: ~$1-2/month
- Improves performance globally
- Typical cost: $0.085 per GB

---

## References

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS IAM Documentation](https://docs.aws.amazon.com/iam/)
- [CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- [S3 Pricing](https://aws.amazon.com/s3/pricing/)

---

End of S3 Integration Guide
