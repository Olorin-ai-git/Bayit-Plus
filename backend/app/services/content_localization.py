"""
Content Localization Processors

This module provides processors for translating different content types.
Each processor handles the specific fields for its content type.
"""

from typing import Optional, Dict, Any, List, Type
from beanie import Document

from app.models.content import (
    Content,
    Category,
    LiveChannel,
    RadioStation,
    Podcast,
    PodcastEpisode
)
from app.services.translation_service import translation_service


class ContentLocalizationProcessor:
    """Base processor for content localization."""

    def __init__(self):
        """Initialize the localization processor."""
        self.translation_service = translation_service

    def get_translatable_fields(self, content_type: str) -> List[str]:
        """
        Get list of translatable fields for a content type.

        Args:
            content_type: Type of content (podcast, content, livechannel, radio, category)

        Returns:
            List of field names that can be translated
        """
        field_mappings = {
            "podcast": ["title", "description", "author", "category"],
            "podcast_episode": ["title", "description"],
            "content": ["title", "description", "genre"],
            "livechannel": ["name", "description"],
            "radio": ["name", "description", "genre"],
            "category": ["name", "description"]
        }
        return field_mappings.get(content_type, [])

    async def process_item(
        self,
        item: Document,
        content_type: str,
        languages: List[str] = None
    ) -> Dict[str, Any]:
        """
        Process a single content item for translation.

        Args:
            item: Content item to translate
            content_type: Type of content
            languages: List of language codes to translate to (default: ["en", "es"])

        Returns:
            Dictionary with translation results
        """
        if languages is None:
            languages = ["en", "es"]

        fields_to_translate = self.get_translatable_fields(content_type)
        needs_update = False
        translated_fields = []

        for lang_code in languages:
            for field_name in fields_to_translate:
                source_value = getattr(item, field_name, None)

                if not source_value or not source_value.strip():
                    continue

                target_field_name = f"{field_name}_{lang_code}"
                current_value = getattr(item, target_field_name, None)

                if current_value:
                    continue

                max_tokens = (
                    self.translation_service.max_tokens_long
                    if "description" in field_name
                    else self.translation_service.max_tokens_short
                )

                translated_text = await self.translation_service.translate_field(
                    source_value,
                    lang_code,
                    max_tokens
                )

                if translated_text:
                    setattr(item, target_field_name, translated_text)
                    translated_fields.append({
                        "field": target_field_name,
                        "original": source_value[:50] + "..." if len(source_value) > 50 else source_value,
                        "translation": translated_text[:50] + "..." if len(translated_text) > 50 else translated_text
                    })
                    needs_update = True

        if needs_update:
            await item.save()

        return {
            "item_id": str(item.id),
            "needs_update": needs_update,
            "translated_fields": translated_fields
        }

    async def process_podcast(
        self,
        podcast_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process podcast(s) for translation.

        Args:
            podcast_id: Specific podcast ID to process, or None for all

        Returns:
            Processing results
        """
        if podcast_id:
            podcast = await Podcast.get(podcast_id)
            if not podcast:
                return {"error": f"Podcast {podcast_id} not found"}

            result = await self.process_item(podcast, "podcast")
            return {
                "type": "podcast",
                "total": 1,
                "processed": 1 if result["needs_update"] else 0,
                "results": [result]
            }
        else:
            podcasts = await Podcast.find_all().to_list()
            results = []
            processed_count = 0

            for podcast in podcasts:
                result = await self.process_item(podcast, "podcast")
                results.append(result)
                if result["needs_update"]:
                    processed_count += 1

            return {
                "type": "podcast",
                "total": len(podcasts),
                "processed": processed_count,
                "skipped": len(podcasts) - processed_count,
                "results": results
            }

    async def process_content(
        self,
        content_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process content (VOD) for translation.

        Args:
            content_id: Specific content ID to process, or None for all

        Returns:
            Processing results
        """
        if content_id:
            content = await Content.get(content_id)
            if not content:
                return {"error": f"Content {content_id} not found"}

            result = await self.process_item(content, "content")
            return {
                "type": "content",
                "total": 1,
                "processed": 1 if result["needs_update"] else 0,
                "results": [result]
            }
        else:
            content_items = await Content.find_all().to_list()
            results = []
            processed_count = 0

            for content in content_items:
                result = await self.process_item(content, "content")
                results.append(result)
                if result["needs_update"]:
                    processed_count += 1

            return {
                "type": "content",
                "total": len(content_items),
                "processed": processed_count,
                "skipped": len(content_items) - processed_count,
                "results": results
            }

    async def process_live_channel(
        self,
        channel_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process live channel(s) for translation.

        Args:
            channel_id: Specific channel ID to process, or None for all

        Returns:
            Processing results
        """
        if channel_id:
            channel = await LiveChannel.get(channel_id)
            if not channel:
                return {"error": f"LiveChannel {channel_id} not found"}

            result = await self.process_item(channel, "livechannel")
            return {
                "type": "livechannel",
                "total": 1,
                "processed": 1 if result["needs_update"] else 0,
                "results": [result]
            }
        else:
            channels = await LiveChannel.find_all().to_list()
            results = []
            processed_count = 0

            for channel in channels:
                result = await self.process_item(channel, "livechannel")
                results.append(result)
                if result["needs_update"]:
                    processed_count += 1

            return {
                "type": "livechannel",
                "total": len(channels),
                "processed": processed_count,
                "skipped": len(channels) - processed_count,
                "results": results
            }

    async def process_radio_station(
        self,
        station_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process radio station(s) for translation.

        Args:
            station_id: Specific station ID to process, or None for all

        Returns:
            Processing results
        """
        if station_id:
            station = await RadioStation.get(station_id)
            if not station:
                return {"error": f"RadioStation {station_id} not found"}

            result = await self.process_item(station, "radio")
            return {
                "type": "radio",
                "total": 1,
                "processed": 1 if result["needs_update"] else 0,
                "results": [result]
            }
        else:
            stations = await RadioStation.find_all().to_list()
            results = []
            processed_count = 0

            for station in stations:
                result = await self.process_item(station, "radio")
                results.append(result)
                if result["needs_update"]:
                    processed_count += 1

            return {
                "type": "radio",
                "total": len(stations),
                "processed": processed_count,
                "skipped": len(stations) - processed_count,
                "results": results
            }

    async def process_category(
        self,
        category_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process category/categories for translation.

        Args:
            category_id: Specific category ID to process, or None for all

        Returns:
            Processing results
        """
        if category_id:
            category = await Category.get(category_id)
            if not category:
                return {"error": f"Category {category_id} not found"}

            result = await self.process_item(category, "category")
            return {
                "type": "category",
                "total": 1,
                "processed": 1 if result["needs_update"] else 0,
                "results": [result]
            }
        else:
            categories = await Category.find_all().to_list()
            results = []
            processed_count = 0

            for category in categories:
                result = await self.process_item(category, "category")
                results.append(result)
                if result["needs_update"]:
                    processed_count += 1

            return {
                "type": "category",
                "total": len(categories),
                "processed": processed_count,
                "skipped": len(categories) - processed_count,
                "results": results
            }


localization_processor = ContentLocalizationProcessor()
