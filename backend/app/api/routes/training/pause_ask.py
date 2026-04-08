"""Training Pause & Ask — DEPRECATED.

Replaced by unified job endpoints in /api/v1/pause-ask/jobs.
This router is kept empty to avoid import errors from existing mounts.
"""

from fastapi import APIRouter

router = APIRouter(tags=["training-pause-ask"])
