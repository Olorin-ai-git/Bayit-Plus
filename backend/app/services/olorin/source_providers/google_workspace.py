"""Google Workspace (Drive) source provider."""

import logging
from typing import Optional
from urllib.parse import urlencode

import httpx

from app.services.olorin.source_providers.base import (
    OAuthTokens,
    SourceFolder,
    SourcePage,
    SourceProvider,
    SourceVideo,
)

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
DRIVE_API_BASE = "https://www.googleapis.com/drive/v3"
DRIVE_SCOPES = "https://www.googleapis.com/auth/drive.readonly"
VIDEO_MIME_TYPES = (
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/x-matroska",
)


class GoogleWorkspaceProvider(SourceProvider):
    """Google Drive via OAuth2 + Drive API v3."""

    def __init__(self, client_id: str, client_secret: str):
        self._client_id = client_id
        self._client_secret = client_secret

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        params = {
            "client_id": self._client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": DRIVE_SCOPES,
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    async def exchange_code(
        self, auth_code: str, redirect_uri: str
    ) -> OAuthTokens:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": auth_code,
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            resp.raise_for_status()
            data = resp.json()
        return OAuthTokens(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token", ""),
            expires_in_seconds=data.get("expires_in", 3600),
            scopes=data.get("scope", "").split(),
        )

    async def refresh_access_token(
        self, refresh_token: str
    ) -> OAuthTokens:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "refresh_token": refresh_token,
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                    "grant_type": "refresh_token",
                },
            )
            resp.raise_for_status()
            data = resp.json()
        return OAuthTokens(
            access_token=data["access_token"],
            refresh_token=refresh_token,
            expires_in_seconds=data.get("expires_in", 3600),
            scopes=data.get("scope", "").split(),
        )

    async def list_folders(
        self,
        access_token: str,
        parent_folder_id: Optional[str] = None,
        page_token: Optional[str] = None,
        page_size: int = 50,
    ) -> SourcePage:
        parent = parent_folder_id or "root"
        q = (
            f"'{parent}' in parents and "
            "mimeType='application/vnd.google-apps.folder' and "
            "trashed=false"
        )
        params = {
            "q": q,
            "fields": "nextPageToken,files(id,name,parents)",
            "pageSize": page_size,
            "orderBy": "name",
        }
        if page_token:
            params["pageToken"] = page_token

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{DRIVE_API_BASE}/files",
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()

        folders = [
            SourceFolder(
                folder_id=f["id"],
                name=f["name"],
                path=f["name"],
                parent_id=parent if parent != "root" else None,
            )
            for f in data.get("files", [])
        ]
        return SourcePage(
            items=folders,
            next_page_token=data.get("nextPageToken"),
        )

    async def list_videos(
        self,
        access_token: str,
        folder_id: str,
        page_token: Optional[str] = None,
        page_size: int = 50,
    ) -> SourcePage:
        mime_filter = " or ".join(
            f"mimeType='{m}'" for m in VIDEO_MIME_TYPES
        )
        q = (
            f"'{folder_id}' in parents and "
            f"({mime_filter}) and "
            "trashed=false"
        )
        fields = (
            "nextPageToken,"
            "files(id,name,description,mimeType,size,"
            "thumbnailLink,createdTime,videoMediaMetadata)"
        )
        params = {
            "q": q,
            "fields": fields,
            "pageSize": page_size,
            "orderBy": "name",
        }
        if page_token:
            params["pageToken"] = page_token

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{DRIVE_API_BASE}/files",
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()

        videos = [
            SourceVideo(
                video_id=f["id"],
                title=f["name"],
                description=f.get("description", ""),
                duration_seconds=(
                    f["videoMediaMetadata"].get("durationMillis", 0) // 1000
                    if f.get("videoMediaMetadata")
                    else None
                ),
                thumbnail_url=f.get("thumbnailLink"),
                mime_type=f.get("mimeType", ""),
                size_bytes=int(f["size"]) if f.get("size") else None,
                created_at=f.get("createdTime"),
            )
            for f in data.get("files", [])
        ]
        return SourcePage(
            items=videos,
            next_page_token=data.get("nextPageToken"),
        )

    async def search_videos(
        self,
        access_token: str,
        query: str,
        page_token: Optional[str] = None,
        page_size: int = 50,
    ) -> SourcePage:
        mime_filter = " or ".join(
            f"mimeType='{m}'" for m in VIDEO_MIME_TYPES
        )
        q = (
            f"fullText contains '{query}' and "
            f"({mime_filter}) and "
            "trashed=false"
        )
        params = {
            "q": q,
            "fields": (
                "nextPageToken,"
                "files(id,name,description,mimeType,size,thumbnailLink)"
            ),
            "pageSize": page_size,
        }
        if page_token:
            params["pageToken"] = page_token

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{DRIVE_API_BASE}/files",
                params=params,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()

        videos = [
            SourceVideo(
                video_id=f["id"],
                title=f["name"],
                description=f.get("description", ""),
                mime_type=f.get("mimeType", ""),
                size_bytes=int(f["size"]) if f.get("size") else None,
                thumbnail_url=f.get("thumbnailLink"),
            )
            for f in data.get("files", [])
        ]
        return SourcePage(
            items=videos,
            next_page_token=data.get("nextPageToken"),
        )

    async def download_video(
        self,
        access_token: str,
        video_id: str,
        dest_path: str,
    ) -> str:
        url = f"{DRIVE_API_BASE}/files/{video_id}?alt=media"
        async with httpx.AsyncClient(timeout=600) as client:
            async with client.stream(
                "GET",
                url,
                headers={"Authorization": f"Bearer {access_token}"},
            ) as resp:
                resp.raise_for_status()
                with open(dest_path, "wb") as fh:
                    async for chunk in resp.aiter_bytes(chunk_size=8192):
                        fh.write(chunk)
        return dest_path

    async def get_embed_url(
        self,
        access_token: str,
        video_id: str,
        expiry_seconds: int = 3600,
    ) -> str:
        return f"https://drive.google.com/file/d/{video_id}/preview"

    async def get_stream_url(
        self,
        access_token: str,
        video_id: str,
    ) -> str:
        return f"{DRIVE_API_BASE}/files/{video_id}?alt=media"
