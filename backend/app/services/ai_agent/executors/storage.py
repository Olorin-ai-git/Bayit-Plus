"""
AI Agent Executors - Storage Monitoring

Functions for checking storage usage, finding large files, and calculating costs.
"""

import logging
from typing import Any, Dict

from app.core.config import settings

logger = logging.getLogger(__name__)


async def execute_check_storage_usage(
    bucket_name: str = "bayit-plus-media-new",
) -> Dict[str, Any]:
    """Check Google Cloud Storage bucket usage statistics."""
    try:
        from google.cloud import storage

        client = storage.Client()
        bucket = client.bucket(bucket_name)

        total_size = 0
        file_count = 0
        type_breakdown = {}

        blobs = bucket.list_blobs()
        for blob in blobs:
            file_count += 1
            total_size += blob.size

            ext = blob.name.split(".")[-1].lower() if "." in blob.name else "unknown"
            if ext not in type_breakdown:
                type_breakdown[ext] = {"count": 0, "size": 0}
            type_breakdown[ext]["count"] += 1
            type_breakdown[ext]["size"] += blob.size

        total_size_gb = total_size / (1024 * 1024 * 1024)

        sorted_types = sorted(
            type_breakdown.items(), key=lambda x: x[1]["size"], reverse=True
        )[:10]

        return {
            "success": True,
            "bucket_name": bucket_name,
            "total_size_gb": round(total_size_gb, 2),
            "file_count": file_count,
            "top_file_types": [
                {
                    "type": ext,
                    "count": data["count"],
                    "size_gb": round(data["size"] / (1024 * 1024 * 1024), 2),
                }
                for ext, data in sorted_types
            ],
        }

    except Exception as e:
        logger.error(f"Error checking storage usage: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_list_large_files(
    bucket_name: str = "bayit-plus-media-new",
    size_threshold_gb: float = 5.0,
    limit: int = 20,
) -> Dict[str, Any]:
    """Find files larger than a specified size threshold."""
    try:
        from google.cloud import storage

        client = storage.Client()
        bucket = client.bucket(bucket_name)

        threshold_bytes = size_threshold_gb * 1024 * 1024 * 1024
        large_files = []

        blobs = bucket.list_blobs()
        for blob in blobs:
            if blob.size >= threshold_bytes:
                large_files.append(
                    {
                        "name": blob.name,
                        "size_gb": round(blob.size / (1024 * 1024 * 1024), 2),
                        "content_type": blob.content_type,
                        "created": blob.time_created.isoformat()
                        if blob.time_created
                        else None,
                    }
                )

        large_files.sort(key=lambda x: x["size_gb"], reverse=True)
        large_files = large_files[:limit]

        return {
            "success": True,
            "bucket_name": bucket_name,
            "threshold_gb": size_threshold_gb,
            "large_files_count": len(large_files),
            "large_files": large_files,
        }

    except Exception as e:
        logger.error(f"Error listing large files: {str(e)}")
        return {"success": False, "error": str(e)}


async def execute_calculate_storage_costs(
    bucket_name: str = "bayit-plus-media-new", storage_class: str = "STANDARD"
) -> Dict[str, Any]:
    """Calculate estimated monthly storage costs."""
    try:
        # GCS pricing per GB per month (US multi-region)
        pricing = {
            "STANDARD": 0.026,
            "NEARLINE": 0.010,
            "COLDLINE": 0.004,
            "ARCHIVE": 0.0012,
        }

        price_per_gb = pricing.get(storage_class, pricing["STANDARD"])

        usage = await execute_check_storage_usage(bucket_name)
        if not usage.get("success"):
            return usage

        total_size_gb = usage.get("total_size_gb", 0)
        monthly_cost = total_size_gb * price_per_gb

        return {
            "success": True,
            "bucket_name": bucket_name,
            "storage_class": storage_class,
            "total_size_gb": total_size_gb,
            "price_per_gb_usd": price_per_gb,
            "estimated_monthly_cost_usd": round(monthly_cost, 2),
            "file_count": usage.get("file_count", 0),
        }

    except Exception as e:
        logger.error(f"Error calculating storage costs: {str(e)}")
        return {"success": False, "error": str(e)}
