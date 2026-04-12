"""Abstract interface for authenticated source providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SourceFolder:
    """A folder in the source platform."""
    folder_id: str
    name: str
    path: str
    parent_id: Optional[str] = None
    video_count: Optional[int] = None


@dataclass
class SourceVideo:
    """A video in the source platform."""
    video_id: str
    title: str
    description: str = ""
    duration_seconds: Optional[int] = None
    thumbnail_url: Optional[str] = None
    folder_path: str = ""
    mime_type: str = ""
    size_bytes: Optional[int] = None
    created_at: Optional[str] = None


@dataclass
class SourcePage:
    """Paginated response from source browser."""
    items: list = field(default_factory=list)
    next_page_token: Optional[str] = None
    total_count: Optional[int] = None


@dataclass
class OAuthTokens:
    """OAuth token pair returned from auth flow."""
    access_token: str
    refresh_token: str
    expires_in_seconds: int
    scopes: list[str] = field(default_factory=list)


class SourceProvider(ABC):
    """Abstract interface for authenticated video source platforms."""

    @abstractmethod
    async def exchange_code(self, auth_code: str, redirect_uri: str) -> OAuthTokens:
        """Exchange OAuth authorization code for tokens."""

    @abstractmethod
    async def refresh_access_token(self, refresh_token: str) -> OAuthTokens:
        """Refresh an expired access token."""

    @abstractmethod
    async def list_folders(
        self,
        access_token: str,
        parent_folder_id: Optional[str] = None,
        page_token: Optional[str] = None,
        page_size: int = 50,
    ) -> SourcePage:
        """List folders in the source platform."""

    @abstractmethod
    async def list_videos(
        self,
        access_token: str,
        folder_id: str,
        page_token: Optional[str] = None,
        page_size: int = 50,
    ) -> SourcePage:
        """List videos in a folder."""

    @abstractmethod
    async def search_videos(
        self,
        access_token: str,
        query: str,
        page_token: Optional[str] = None,
        page_size: int = 50,
    ) -> SourcePage:
        """Search for videos across the source platform."""

    @abstractmethod
    async def download_video(
        self,
        access_token: str,
        video_id: str,
        dest_path: str,
    ) -> str:
        """Download video to local path. Returns the dest_path."""

    @abstractmethod
    async def get_embed_url(
        self,
        access_token: str,
        video_id: str,
        expiry_seconds: int = 3600,
    ) -> str:
        """Generate a time-limited embed URL for passive playback."""

    @abstractmethod
    async def get_stream_url(
        self,
        access_token: str,
        video_id: str,
    ) -> str:
        """Get direct download/stream URL for proxy playback."""

    @abstractmethod
    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        """Build the OAuth authorization URL for user consent."""
