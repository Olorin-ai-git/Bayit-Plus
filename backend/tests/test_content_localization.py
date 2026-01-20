"""
Unit Tests for Content Localization Processor

Tests the content type processors for localization.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from app.services.content_localization import ContentLocalizationProcessor
from app.models.content import Podcast, Content, LiveChannel, RadioStation
from app.models.content_taxonomy import ContentSection


class TestContentLocalizationProcessor:
    """Test cases for ContentLocalizationProcessor."""

    @pytest.fixture
    def processor(self):
        """Create a localization processor instance."""
        return ContentLocalizationProcessor()

    def test_initialization(self, processor):
        """Test processor initialization."""
        assert processor.translation_service is not None

    def test_get_translatable_fields_podcast(self, processor):
        """Test getting translatable fields for podcast."""
        fields = processor.get_translatable_fields("podcast")
        assert "title" in fields
        assert "description" in fields
        assert "author" in fields
        assert "category" in fields

    def test_get_translatable_fields_content(self, processor):
        """Test getting translatable fields for content."""
        fields = processor.get_translatable_fields("content")
        assert "title" in fields
        assert "description" in fields
        assert "genre" in fields

    def test_get_translatable_fields_livechannel(self, processor):
        """Test getting translatable fields for live channel."""
        fields = processor.get_translatable_fields("livechannel")
        assert "name" in fields
        assert "description" in fields

    def test_get_translatable_fields_radio(self, processor):
        """Test getting translatable fields for radio."""
        fields = processor.get_translatable_fields("radio")
        assert "name" in fields
        assert "description" in fields
        assert "genre" in fields

    def test_get_translatable_fields_category(self, processor):
        """Test getting translatable fields for category."""
        fields = processor.get_translatable_fields("category")
        assert "name" in fields
        assert "description" in fields

    def test_get_translatable_fields_unknown(self, processor):
        """Test getting fields for unknown content type returns empty list."""
        fields = processor.get_translatable_fields("unknown_type")
        assert fields == []

    @pytest.mark.asyncio
    async def test_process_item_with_translations(self, processor):
        """Test processing an item that needs translations."""
        mock_podcast = Mock()
        mock_podcast.id = "test123"
        mock_podcast.title = "שלום"
        mock_podcast.description = "זה תיאור"
        mock_podcast.author = "יוסי כהן"
        mock_podcast.category = "חדשות"
        mock_podcast.title_en = None
        mock_podcast.title_es = None
        mock_podcast.description_en = None
        mock_podcast.description_es = None
        mock_podcast.author_en = None
        mock_podcast.author_es = None
        mock_podcast.category_en = None
        mock_podcast.category_es = None
        mock_podcast.save = AsyncMock()

        with patch.object(
            processor.translation_service,
            'translate_field',
            return_value="Translated"
        ):
            result = await processor.process_item(mock_podcast, "podcast")

            assert result["needs_update"] is True
            assert result["item_id"] == "test123"
            assert len(result["translated_fields"]) > 0
            mock_podcast.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_item_already_translated(self, processor):
        """Test processing an item that already has translations."""
        mock_podcast = Mock()
        mock_podcast.id = "test123"
        mock_podcast.title = "שלום"
        mock_podcast.description = "זה תיאור"
        mock_podcast.author = "יוסי כהן"
        mock_podcast.category = "חדשות"
        mock_podcast.title_en = "Hello"
        mock_podcast.title_es = "Hola"
        mock_podcast.description_en = "This is a description"
        mock_podcast.description_es = "Esta es una descripción"
        mock_podcast.author_en = "Yossi Cohen"
        mock_podcast.author_es = "Yossi Cohen"
        mock_podcast.category_en = "News"
        mock_podcast.category_es = "Noticias"
        mock_podcast.save = AsyncMock()

        result = await processor.process_item(mock_podcast, "podcast")

        assert result["needs_update"] is False
        assert result["item_id"] == "test123"
        assert len(result["translated_fields"]) == 0
        mock_podcast.save.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_item_empty_fields(self, processor):
        """Test processing an item with empty fields."""
        mock_podcast = Mock()
        mock_podcast.id = "test123"
        mock_podcast.title = ""
        mock_podcast.description = None
        mock_podcast.author = ""
        mock_podcast.category = None
        mock_podcast.save = AsyncMock()

        result = await processor.process_item(mock_podcast, "podcast")

        assert result["needs_update"] is False
        assert len(result["translated_fields"]) == 0
        mock_podcast.save.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_podcast_single_item(self, processor):
        """Test processing a single podcast by ID."""
        mock_podcast = Mock()
        mock_podcast.id = "test123"
        mock_podcast.title = "שלום"
        mock_podcast.description = "תיאור"
        mock_podcast.author = "יוסי"
        mock_podcast.category = "חדשות"
        mock_podcast.title_en = None
        mock_podcast.title_es = None
        mock_podcast.description_en = None
        mock_podcast.description_es = None
        mock_podcast.author_en = None
        mock_podcast.author_es = None
        mock_podcast.category_en = None
        mock_podcast.category_es = None
        mock_podcast.save = AsyncMock()

        with patch('app.services.content_localization.Podcast') as mock_podcast_class:
            mock_podcast_class.get = AsyncMock(return_value=mock_podcast)

            with patch.object(
                processor.translation_service,
                'translate_field',
                return_value="Translated"
            ):
                result = await processor.process_podcast("test123")

                assert result["type"] == "podcast"
                assert result["total"] == 1
                assert result["processed"] == 1
                mock_podcast_class.get.assert_called_once_with("test123")

    @pytest.mark.asyncio
    async def test_process_podcast_not_found(self, processor):
        """Test processing a podcast that doesn't exist."""
        with patch('app.services.content_localization.Podcast') as mock_podcast_class:
            mock_podcast_class.get = AsyncMock(return_value=None)

            result = await processor.process_podcast("nonexistent")

            assert "error" in result
            assert "not found" in result["error"]

    @pytest.mark.asyncio
    async def test_process_podcast_all_items(self, processor):
        """Test processing all podcasts."""
        mock_podcasts = []
        for i in range(3):
            mock_podcast = Mock()
            mock_podcast.id = f"test{i}"
            mock_podcast.title = f"שלום {i}"
            mock_podcast.description = f"תיאור {i}"
            mock_podcast.author = "יוסי"
            mock_podcast.category = "חדשות"
            if i < 2:
                mock_podcast.title_en = None
                mock_podcast.title_es = None
                mock_podcast.description_en = None
                mock_podcast.description_es = None
                mock_podcast.author_en = None
                mock_podcast.author_es = None
                mock_podcast.category_en = None
                mock_podcast.category_es = None
            else:
                mock_podcast.title_en = "Already translated"
                mock_podcast.title_es = "Ya traducido"
                mock_podcast.description_en = "Already translated"
                mock_podcast.description_es = "Ya traducido"
                mock_podcast.author_en = "Already translated"
                mock_podcast.author_es = "Ya traducido"
                mock_podcast.category_en = "Already translated"
                mock_podcast.category_es = "Ya traducido"
            mock_podcast.save = AsyncMock()
            mock_podcasts.append(mock_podcast)

        with patch('app.services.content_localization.Podcast') as mock_podcast_class:
            mock_podcast_class.find_all = Mock()
            mock_podcast_class.find_all.return_value.to_list = AsyncMock(return_value=mock_podcasts)

            with patch.object(
                processor.translation_service,
                'translate_field',
                return_value="Translated"
            ):
                result = await processor.process_podcast()

                assert result["type"] == "podcast"
                assert result["total"] == 3
                assert result["processed"] == 2

    @pytest.mark.asyncio
    async def test_process_content_single_item(self, processor):
        """Test processing a single content item."""
        mock_content = Mock()
        mock_content.id = "test123"
        mock_content.title = "שם הסרט"
        mock_content.description = "תיאור הסרט"
        mock_content.genre = "דרמה"
        mock_content.title_en = None
        mock_content.title_es = None
        mock_content.description_en = None
        mock_content.description_es = None
        mock_content.genre_en = None
        mock_content.genre_es = None
        mock_content.save = AsyncMock()

        with patch('app.services.content_localization.Content') as mock_content_class:
            mock_content_class.get = AsyncMock(return_value=mock_content)

            with patch.object(
                processor.translation_service,
                'translate_field',
                return_value="Translated"
            ):
                result = await processor.process_content("test123")

                assert result["type"] == "content"
                assert result["total"] == 1
                assert result["processed"] == 1

    @pytest.mark.asyncio
    async def test_process_live_channel(self, processor):
        """Test processing a live channel."""
        mock_channel = Mock()
        mock_channel.id = "test123"
        mock_channel.name = "ערוץ 1"
        mock_channel.description = "תיאור הערוץ"
        mock_channel.name_en = None
        mock_channel.name_es = None
        mock_channel.description_en = None
        mock_channel.description_es = None
        mock_channel.save = AsyncMock()

        with patch('app.services.content_localization.LiveChannel') as mock_channel_class:
            mock_channel_class.get = AsyncMock(return_value=mock_channel)

            with patch.object(
                processor.translation_service,
                'translate_field',
                return_value="Translated"
            ):
                result = await processor.process_live_channel("test123")

                assert result["type"] == "livechannel"
                assert result["total"] == 1
                assert result["processed"] == 1

    @pytest.mark.asyncio
    async def test_process_radio_station(self, processor):
        """Test processing a radio station."""
        mock_station = Mock()
        mock_station.id = "test123"
        mock_station.name = "רדיו 1"
        mock_station.description = "תיאור התחנה"
        mock_station.genre = "פופ"
        mock_station.name_en = None
        mock_station.name_es = None
        mock_station.description_en = None
        mock_station.description_es = None
        mock_station.genre_en = None
        mock_station.genre_es = None
        mock_station.save = AsyncMock()

        with patch('app.services.content_localization.RadioStation') as mock_station_class:
            mock_station_class.get = AsyncMock(return_value=mock_station)

            with patch.object(
                processor.translation_service,
                'translate_field',
                return_value="Translated"
            ):
                result = await processor.process_radio_station("test123")

                assert result["type"] == "radio"
                assert result["total"] == 1
                assert result["processed"] == 1

    @pytest.mark.asyncio
    async def test_process_category(self, processor):
        """Test processing a category."""
        mock_category = Mock()
        mock_category.id = "test123"
        mock_category.name = "חדשות"
        mock_category.description = "תיאור הקטגוריה"
        mock_category.name_en = None
        mock_category.name_es = None
        mock_category.description_en = None
        mock_category.description_es = None
        mock_category.save = AsyncMock()

        with patch('app.services.content_localization.ContentSection') as mock_category_class:
            mock_category_class.get = AsyncMock(return_value=mock_category)

            with patch.object(
                processor.translation_service,
                'translate_field',
                return_value="Translated"
            ):
                result = await processor.process_category("test123")

                assert result["type"] == "category"
                assert result["total"] == 1
                assert result["processed"] == 1
