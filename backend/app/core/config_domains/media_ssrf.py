"""Domain config: SSRF protection domain whitelists and parsing."""
import json

from pydantic import Field


class MediaSsrfConfigMixin:
    """SSRF protection domain whitelists for images, subtitles, EPG, scrapers, and audio."""

    # SSRF Protection - Whitelisted domains for external HTTP requests
    # These can be configured via environment variables as JSON arrays or comma-separated strings
    ALLOWED_IMAGE_DOMAINS: str | list[str] = Field(
        default="",
        description="Whitelisted domains for image downloads (SSRF protection)",
    )
    ALLOWED_SUBTITLE_DOMAINS: str | list[str] = Field(
        default="",
        description="Whitelisted domains for subtitle downloads (SSRF protection)",
    )
    ALLOWED_EPG_DOMAINS: str | list[str] = Field(
        default="",
        description="Whitelisted domains for EPG data fetching (SSRF protection)",
    )
    ALLOWED_SCRAPER_DOMAINS: str | list[str] = Field(
        default="",
        description="Whitelisted domains for content scrapers (SSRF protection)",
    )

    @property
    def parsed_image_domains(self) -> list[str]:
        """Parse ALLOWED_IMAGE_DOMAINS from environment variable."""
        return self._parse_domain_list(
            self.ALLOWED_IMAGE_DOMAINS,
            default=[
                "image.tmdb.org",
                "api.themoviedb.org",
                "storage.googleapis.com",
                "lh3.googleusercontent.com",
                "i.ytimg.com",
                "img.youtube.com",
            ],
        )

    @property
    def parsed_subtitle_domains(self) -> list[str]:
        """Parse ALLOWED_SUBTITLE_DOMAINS from environment variable."""
        return self._parse_domain_list(
            self.ALLOWED_SUBTITLE_DOMAINS,
            default=[
                "api.opensubtitles.com",
                "rest.opensubtitles.org",
                "storage.googleapis.com",
            ],
        )

    @property
    def parsed_epg_domains(self) -> list[str]:
        """Parse ALLOWED_EPG_DOMAINS from environment variable."""
        return self._parse_domain_list(
            self.ALLOWED_EPG_DOMAINS,
            default=[
                "www.kan.org.il",
                "kan.org.il",
                "api.mako.co.il",
                "raw.githubusercontent.com",
                "github.com",
                "iptv-org.github.io",
                "tv.schedulesdirect.org",
                "storage.googleapis.com",
            ],
        )

    @property
    def parsed_scraper_domains(self) -> list[str]:
        """Parse ALLOWED_SCRAPER_DOMAINS from environment variable."""
        return self._parse_domain_list(
            self.ALLOWED_SCRAPER_DOMAINS,
            default=[
                "youtube.com",
                "youtu.be",
                "www.youtube.com",
                "podcasts.apple.com",
                "rss.art19.com",
                "feeds.megaphone.fm",
                "feeds.simplecast.com",
                "feeds.howstuffworks.com",
                "feeds.npr.org",
                "feeds.podcastone.com",
                "feeds.buzzsprout.com",
                "feeds.transistor.fm",
                "feeds.soundcloud.com",
                "anchor.fm",
                "storage.googleapis.com",
            ],
        )

    @property
    def parsed_audio_domains(self) -> list[str]:
        """Parse ALLOWED_AUDIO_DOMAINS from environment variable."""
        return self._parse_domain_list(
            self.ALLOWED_AUDIO_DOMAINS,
            default=[
                "anchor.fm",
                "spotify.com",
                "podcasts.apple.com",
                "feeds.buzzsprout.com",
                "feeds.transistor.fm",
                "feeds.soundcloud.com",
                "feeds.megaphone.fm",
                "feeds.simplecast.com",
                "feeds.art19.com",
                "feeds.howstuffworks.com",
                "feeds.npr.org",
                "feeds.podcastone.com",
                "rss.art19.com",
                "traffic.megaphone.fm",
                "traffic.libsyn.com",
                "media.blubrry.com",
                "dcs.megaphone.fm",
                "storage.googleapis.com",
                "s3.amazonaws.com",
                "cloudfront.net",
            ],
        )

    def _parse_domain_list(
        self, value: str | list[str], default: list[str]
    ) -> list[str]:
        """
        Parse domain list from string or list.

        Args:
            value: String (JSON or comma-separated) or list of domains
            default: Default list if value is empty

        Returns:
            List of domain strings
        """
        if not value:
            return default

        if isinstance(value, list):
            return value

        # Try JSON parsing first
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except (json.JSONDecodeError, TypeError):
            pass

        # Fallback to comma-separated parsing
        return [domain.strip() for domain in value.split(",") if domain.strip()]
