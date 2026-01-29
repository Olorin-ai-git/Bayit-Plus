"""Unit tests for GeolocationEnhancer service."""

import pytest

from app.services.geolocation_enhancer import EnhancedHeadlineItem, GeolocationEnhancer
from app.services.location_constants import JERUSALEM_COORDS
from app.services.news_scraper import HeadlineItem
from datetime import datetime, timezone


@pytest.fixture
def enhancer():
    """Create GeolocationEnhancer instance."""
    return GeolocationEnhancer()


class TestProximityScoring:
    """Test proximity score calculations."""

    def test_proximity_score_exact_location(self, enhancer):
        """0km distance = max score (10.0)"""
        score = enhancer.calculate_proximity_score(0)
        assert score == 10.0

    def test_proximity_score_nearby(self, enhancer):
        """50km distance = medium score (5.0)"""
        score = enhancer.calculate_proximity_score(50)
        assert score == 5.0

    def test_proximity_score_far(self, enhancer):
        """100km+ distance = min score (0.0)"""
        score = enhancer.calculate_proximity_score(150)
        assert score == 0.0

    def test_proximity_score_quarter_distance(self, enhancer):
        """25km distance = 7.5 score"""
        score = enhancer.calculate_proximity_score(25)
        assert score == 7.5

    def test_proximity_score_none(self, enhancer):
        """None distance = 0.0 score"""
        score = enhancer.calculate_proximity_score(None)
        assert score == 0.0


class TestHaversineDistance:
    """Test haversine distance calculations."""

    def test_distance_same_point(self, enhancer):
        """Distance between same point is 0"""
        coords = (31.7683, 35.2137)
        distance = enhancer.calculate_haversine_distance(coords, coords)
        assert distance == 0.0

    def test_distance_jerusalem_tel_aviv(self, enhancer):
        """Distance Jerusalem to Tel Aviv ~55km"""
        jerusalem = (31.7683, 35.2137)
        tel_aviv = (32.0853, 34.7818)
        distance = enhancer.calculate_haversine_distance(jerusalem, tel_aviv)
        assert 50 < distance < 60

    def test_distance_jerusalem_haifa(self, enhancer):
        """Distance Jerusalem to Haifa ~116km"""
        jerusalem = (31.7683, 35.2137)
        haifa = (32.7940, 34.9896)
        distance = enhancer.calculate_haversine_distance(jerusalem, haifa)
        assert 110 < distance < 120


class TestLocationMentionExtraction:
    """Test city mention detection."""

    @pytest.mark.asyncio
    async def test_detect_jerusalem_hebrew(self, enhancer):
        """Extract 'Jerusalem' from Hebrew text"""
        text = "אירוע חשוב בירושלים בשבוע הבא"
        mentions = await enhancer.geocode_location_mentions(text)

        assert len(mentions) > 0
        assert any("Jerusalem" in m[0] for m in mentions)

    @pytest.mark.asyncio
    async def test_detect_jerusalem_english(self, enhancer):
        """Extract 'Jerusalem' from English text"""
        text = "Event at Jerusalem Old City near Western Wall"
        mentions = await enhancer.geocode_location_mentions(text)

        assert len(mentions) > 0
        assert any("Jerusalem" in m[0] for m in mentions)

    @pytest.mark.asyncio
    async def test_detect_tel_aviv_hebrew(self, enhancer):
        """Extract 'Tel Aviv' from Hebrew text"""
        text = "קונצרט גדול בתל אביב הבוקר"
        mentions = await enhancer.geocode_location_mentions(text)

        assert len(mentions) > 0
        assert any("Tel Aviv" in m[0] for m in mentions)

    @pytest.mark.asyncio
    async def test_detect_multiple_cities(self, enhancer):
        """Extract multiple city mentions"""
        text = "Journey from Jerusalem through Haifa to Tel Aviv"
        mentions = await enhancer.geocode_location_mentions(text)

        assert len(mentions) >= 2
        city_names = [m[0] for m in mentions]
        assert "Jerusalem" in city_names or "Tel Aviv" in city_names or "Haifa" in city_names

    @pytest.mark.asyncio
    async def test_no_city_mentions(self, enhancer):
        """Return empty list when no cities mentioned"""
        text = "Generic news about weather and politics"
        mentions = await enhancer.geocode_location_mentions(text)

        assert len(mentions) == 0


class TestHeadlineEnhancement:
    """Test full headline enhancement."""

    @pytest.mark.asyncio
    async def test_enhance_jerusalem_headline(self, enhancer):
        """Enhance headline about Jerusalem"""
        headline = HeadlineItem(
            title="Event in Jerusalem Old City",
            summary="Major festival at Western Wall",
            source="Ynet",
            url="https://example.com/news",
            scraped_at=datetime.now(timezone.utc),
        )

        enhanced = await enhancer.enhance_headlines(
            [headline],
            reference_coords=JERUSALEM_COORDS,
            radius_km=50,
        )

        assert len(enhanced) == 1
        assert enhanced[0].proximity_score > 0
        assert enhanced[0].distance_km is not None
        assert enhanced[0].detected_location == "Jerusalem"

    @pytest.mark.asyncio
    async def test_radius_filtering_excludes_far_content(self, enhancer):
        """Filter Haifa event when searching within 50km of Jerusalem"""
        headlines = [
            HeadlineItem(
                title="Jerusalem Festival",
                summary="Festival in Jerusalem",
                source="Ynet",
                url="https://example.com/1",
                scraped_at=datetime.now(timezone.utc),
            ),
            HeadlineItem(
                title="Haifa Concert",
                summary="Concert in Haifa port",
                source="Walla",
                url="https://example.com/2",
                scraped_at=datetime.now(timezone.utc),
            ),
        ]

        enhanced = await enhancer.enhance_headlines(
            headlines,
            reference_coords=JERUSALEM_COORDS,
            radius_km=50,
        )

        assert len(enhanced) == 1
        assert "Jerusalem" in enhanced[0].title

    @pytest.mark.asyncio
    async def test_radius_filtering_includes_nearby(self, enhancer):
        """Include Tel Aviv when searching within 60km of Jerusalem"""
        headlines = [
            HeadlineItem(
                title="Tel Aviv Event",
                summary="Event at Tel Aviv beach",
                source="Ynet",
                url="https://example.com/1",
                scraped_at=datetime.now(timezone.utc),
            ),
        ]

        enhanced = await enhancer.enhance_headlines(
            headlines,
            reference_coords=JERUSALEM_COORDS,
            radius_km=60,
        )

        assert len(enhanced) == 1
        assert "Tel Aviv" in enhanced[0].title

    @pytest.mark.asyncio
    async def test_no_location_detected(self, enhancer):
        """Handle headlines with no location mentions"""
        headline = HeadlineItem(
            title="Generic news story",
            summary="Something happened somewhere",
            source="Ynet",
            url="https://example.com/news",
            scraped_at=datetime.now(timezone.utc),
        )

        enhanced = await enhancer.enhance_headlines(
            [headline],
            reference_coords=JERUSALEM_COORDS,
        )

        assert len(enhanced) == 1
        assert enhanced[0].proximity_score == 0.0
        assert enhanced[0].distance_km is None
        assert enhanced[0].detected_location is None
