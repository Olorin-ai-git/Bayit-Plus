"""Panopto source provider. Requires per-customer server URL."""

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


class PanoptoProvider(SourceProvider):
    """Panopto via OAuth2 + REST API."""

    def __init__(self, client_id: str, client_secret: str, server_url: str):
        self._client_id = client_id
        self._client_secret = client_secret
        self._base = server_url.rstrip("/")

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        params = {
            "client_id": self._client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid api",
            "state": state,
        }
        return f"{self._base}/Panopto/oauth2/connect/authorize?{urlencode(params)}"

    async def exchange_code(self, auth_code: str, redirect_uri: str) -> OAuthTokens:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._base}/Panopto/oauth2/connect/token",
                data={
                    "grant_type": "authorization_code",
                    "code": auth_code,
                    "redirect_uri": redirect_uri,
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
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

    async def refresh_access_token(self, refresh_token: str) -> OAuthTokens:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self._base}/Panopto/oauth2/connect/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                },
            )
            resp.raise_for_status()
            data = resp.json()
        return OAuthTokens(
            access_token=data["access_token"],
            refresh_token=refresh_token,
            expires_in_seconds=data.get("expires_in", 3600),
        )

    async def _api_get(self, access_token: str, path: str, params: Optional[dict] = None) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self._base}/Panopto/api/v1{path}",
                params=params or {},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            return resp.json()

    async def list_folders(self, access_token: str, parent_folder_id: Optional[str] = None,
                           page_token: Optional[str] = None, page_size: int = 50) -> SourcePage:
        params = {"maxResults": page_size, "sortField": "Name", "sortOrder": "Asc"}
        if parent_folder_id:
            params["parentFolderId"] = parent_folder_id
        if page_token:
            params["pageNumber"] = int(page_token)
        data = await self._api_get(access_token, "/folders", params)
        results = data.get("Results", [])
        folders = [
            SourceFolder(folder_id=f["Id"], name=f["Name"], path=f["Name"],
                         parent_id=f.get("ParentFolder", {}).get("Id"))
            for f in results
        ]
        next_page = str(int(page_token or "0") + 1) if len(results) == page_size else None
        return SourcePage(items=folders, next_page_token=next_page)

    async def list_videos(self, access_token: str, folder_id: str,
                          page_token: Optional[str] = None, page_size: int = 50) -> SourcePage:
        params = {"folderID": folder_id, "maxResults": page_size, "sortField": "Name", "sortOrder": "Asc"}
        if page_token:
            params["pageNumber"] = int(page_token)
        data = await self._api_get(access_token, "/sessions", params)
        results = data.get("Results", [])
        videos = [
            SourceVideo(video_id=s["Id"], title=s["Name"], description=s.get("Description", ""),
                        duration_seconds=int(s.get("Duration", 0)),
                        thumbnail_url=s.get("ThumbUrl"), folder_path=s.get("FolderName", ""),
                        created_at=s.get("CreatedDate"))
            for s in results
        ]
        next_page = str(int(page_token or "0") + 1) if len(results) == page_size else None
        return SourcePage(items=videos, next_page_token=next_page)

    async def search_videos(self, access_token: str, query: str,
                            page_token: Optional[str] = None, page_size: int = 50) -> SourcePage:
        params = {"query": query, "maxResults": page_size}
        if page_token:
            params["pageNumber"] = int(page_token)
        data = await self._api_get(access_token, "/sessions", params)
        results = data.get("Results", [])
        videos = [
            SourceVideo(video_id=s["Id"], title=s["Name"], description=s.get("Description", ""),
                        duration_seconds=int(s.get("Duration", 0)), thumbnail_url=s.get("ThumbUrl"))
            for s in results
        ]
        next_page = str(int(page_token or "0") + 1) if len(results) == page_size else None
        return SourcePage(items=videos, next_page_token=next_page)

    async def download_video(self, access_token: str, video_id: str, dest_path: str) -> str:
        url = f"{self._base}/Panopto/api/v1/sessions/{video_id}/download"
        async with httpx.AsyncClient(timeout=600) as client:
            async with client.stream("GET", url, headers={"Authorization": f"Bearer {access_token}"}) as resp:
                resp.raise_for_status()
                with open(dest_path, "wb") as f:
                    async for chunk in resp.aiter_bytes(chunk_size=8192):
                        f.write(chunk)
        return dest_path

    async def get_embed_url(self, access_token: str, video_id: str, expiry_seconds: int = 3600) -> str:
        return f"{self._base}/Panopto/Pages/Embed.aspx?id={video_id}&autoplay=false&offerviewer=false"

    async def get_stream_url(self, access_token: str, video_id: str) -> str:
        return f"{self._base}/Panopto/api/v1/sessions/{video_id}/download"
