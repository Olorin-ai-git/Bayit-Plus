"""
Create Atlas Search indexes for the Bayit+ search pipeline.

Usage:
    poetry run python scripts/create_atlas_search_indexes.py

Requires MONGODB_URI environment variable with Atlas connection string.
The Atlas user must have the 'Atlas Search Index Management' role.

This script is idempotent - running it again will update existing indexes.
"""

import asyncio
import os
import sys

from motor.motor_asyncio import AsyncIOMotorClient

# Custom analyzers shared across indexes
HEBREW_ANALYZER = {
    "name": "hebrew_analyzer",
    "charFilters": [
        {
            "type": "mapping",
            "mappings": {
                # Strip nikud (vowel points U+05B0-U+05BD)
                "\u05B0": "", "\u05B1": "", "\u05B2": "", "\u05B3": "",
                "\u05B4": "", "\u05B5": "", "\u05B6": "", "\u05B7": "",
                "\u05B8": "", "\u05B9": "", "\u05BA": "", "\u05BB": "",
                "\u05BC": "", "\u05BD": "",
                # Strip cantillation marks (U+05C1-U+05C5)
                "\u05C1": "", "\u05C2": "", "\u05C3": "",
                "\u05C4": "", "\u05C5": "",
            },
        }
    ],
    "tokenizer": {"type": "standard"},
    "tokenFilters": [
        {"type": "lowercase"},
        {"type": "icuFolding"},
    ],
}

ENGLISH_ANALYZER = {
    "name": "english_analyzer",
    "tokenizer": {"type": "standard"},
    "tokenFilters": [
        {"type": "lowercase"},
        {"type": "icuFolding"},
        {"type": "snowballStemming", "stemmerName": "english"},
    ],
}

NAME_ANALYZER = {
    "name": "name_analyzer",
    "tokenizer": {"type": "standard"},
    "tokenFilters": [
        {"type": "lowercase"},
        {"type": "icuFolding"},
        {"type": "asciiFolding"},
    ],
}

AUTOCOMPLETE_ANALYZER = {
    "name": "autocomplete_analyzer",
    "tokenizer": {"type": "standard"},
    "tokenFilters": [
        {"type": "lowercase"},
        {"type": "icuFolding"},
        {"type": "edgeGram", "minGram": 2, "maxGram": 15},
    ],
}

CUSTOM_ANALYZERS = [HEBREW_ANALYZER, ENGLISH_ANALYZER, NAME_ANALYZER, AUTOCOMPLETE_ANALYZER]


def _content_search_index() -> dict:
    """Atlas Search index definition for the content collection."""
    return {
        "name": os.getenv("SEARCH_RANKING_CONTENT_SEARCH_INDEX", "content_search"),
        "definition": {
            "analyzer": "hebrew_analyzer",
            "analyzers": CUSTOM_ANALYZERS,
            "mappings": {
                "dynamic": False,
                "fields": {
                    "title": [
                        {"type": "string", "analyzer": "hebrew_analyzer"},
                        {"type": "autocomplete", "analyzer": "autocomplete_analyzer"},
                    ],
                    "title_en": [
                        {"type": "string", "analyzer": "english_analyzer"},
                        {"type": "autocomplete", "analyzer": "autocomplete_analyzer"},
                    ],
                    "title_es": {"type": "string", "analyzer": "lucene.spanish"},
                    "description": {"type": "string", "analyzer": "hebrew_analyzer"},
                    "description_en": {"type": "string", "analyzer": "english_analyzer"},
                    "description_es": {"type": "string", "analyzer": "lucene.spanish"},
                    "cast": {"type": "string", "analyzer": "name_analyzer"},
                    "director": {"type": "string", "analyzer": "name_analyzer"},
                    "author": {"type": "string", "analyzer": "name_analyzer"},
                    "narrator": {"type": "string", "analyzer": "name_analyzer"},
                    "genres": {"type": "string", "analyzer": "lucene.keyword"},
                    "genre_ids": {"type": "string", "analyzer": "lucene.keyword"},
                    "topic_tags": {"type": "string", "analyzer": "lucene.keyword"},
                    "is_published": {"type": "boolean"},
                    "is_featured": {"type": "boolean"},
                    "is_kids_content": {"type": "boolean"},
                    "year": {"type": "number"},
                    "view_count": {"type": "number"},
                    "avg_rating": {"type": "number"},
                    "rating": {"type": "number"},
                    "requires_subscription": {"type": "string", "analyzer": "lucene.keyword"},
                    "content_format": {"type": "string", "analyzer": "lucene.keyword"},
                    "content_type": {"type": "string", "analyzer": "lucene.keyword"},
                    "series_id": {"type": "string", "analyzer": "lucene.keyword"},
                    "created_at": {"type": "date"},
                    "available_subtitle_languages": {"type": "string", "analyzer": "lucene.keyword"},
                },
            },
        },
    }


def _live_channels_search_index() -> dict:
    """Atlas Search index for live_channels collection."""
    return {
        "name": os.getenv("SEARCH_RANKING_LIVE_CHANNELS_SEARCH_INDEX", "live_channels_search"),
        "definition": {
            "analyzer": "hebrew_analyzer",
            "analyzers": CUSTOM_ANALYZERS,
            "mappings": {
                "dynamic": False,
                "fields": {
                    "name": [
                        {"type": "string", "analyzer": "hebrew_analyzer"},
                        {"type": "autocomplete", "analyzer": "autocomplete_analyzer"},
                    ],
                    "name_en": [
                        {"type": "string", "analyzer": "english_analyzer"},
                        {"type": "autocomplete", "analyzer": "autocomplete_analyzer"},
                    ],
                    "name_es": {"type": "string", "analyzer": "lucene.spanish"},
                    "description": {"type": "string", "analyzer": "hebrew_analyzer"},
                    "category": {"type": "string", "analyzer": "lucene.keyword"},
                    "is_active": {"type": "boolean"},
                    "order": {"type": "number"},
                },
            },
        },
    }


def _podcasts_search_index() -> dict:
    """Atlas Search index for podcasts collection."""
    return {
        "name": os.getenv("SEARCH_RANKING_PODCASTS_SEARCH_INDEX", "podcasts_search"),
        "definition": {
            "analyzer": "hebrew_analyzer",
            "analyzers": CUSTOM_ANALYZERS,
            "mappings": {
                "dynamic": False,
                "fields": {
                    "title": [
                        {"type": "string", "analyzer": "hebrew_analyzer"},
                        {"type": "autocomplete", "analyzer": "autocomplete_analyzer"},
                    ],
                    "title_en": [
                        {"type": "string", "analyzer": "english_analyzer"},
                        {"type": "autocomplete", "analyzer": "autocomplete_analyzer"},
                    ],
                    "title_es": {"type": "string", "analyzer": "lucene.spanish"},
                    "description": {"type": "string", "analyzer": "hebrew_analyzer"},
                    "author": {"type": "string", "analyzer": "name_analyzer"},
                    "category": {"type": "string", "analyzer": "lucene.keyword"},
                    "is_active": {"type": "boolean"},
                    "is_featured": {"type": "boolean"},
                    "latest_episode_date": {"type": "date"},
                },
            },
        },
    }


def _radio_stations_search_index() -> dict:
    """Atlas Search index for radio_stations collection."""
    return {
        "name": os.getenv("SEARCH_RANKING_RADIO_STATIONS_SEARCH_INDEX", "radio_stations_search"),
        "definition": {
            "analyzer": "hebrew_analyzer",
            "analyzers": CUSTOM_ANALYZERS,
            "mappings": {
                "dynamic": False,
                "fields": {
                    "name": [
                        {"type": "string", "analyzer": "hebrew_analyzer"},
                        {"type": "autocomplete", "analyzer": "autocomplete_analyzer"},
                    ],
                    "name_en": [
                        {"type": "string", "analyzer": "english_analyzer"},
                        {"type": "autocomplete", "analyzer": "autocomplete_analyzer"},
                    ],
                    "name_es": {"type": "string", "analyzer": "lucene.spanish"},
                    "description": {"type": "string", "analyzer": "hebrew_analyzer"},
                    "genre": {"type": "string", "analyzer": "lucene.keyword"},
                    "is_active": {"type": "boolean"},
                    "order": {"type": "number"},
                },
            },
        },
    }


async def create_indexes():
    """Create all Atlas Search indexes."""
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri:
        print("MONGODB_URI environment variable is required")  # noqa: T201 - script output
        sys.exit(1)

    db_name = os.getenv("MONGODB_DB_NAME", "bayit_plus")
    client = AsyncIOMotorClient(mongodb_uri)
    db = client[db_name]

    index_definitions = [
        ("content", _content_search_index()),
        ("live_channels", _live_channels_search_index()),
        ("podcasts", _podcasts_search_index()),
        ("radio_stations", _radio_stations_search_index()),
    ]

    for collection_name, index_def in index_definitions:
        collection = db[collection_name]
        index_name = index_def["name"]
        definition = index_def["definition"]

        try:
            # List existing search indexes
            existing = []
            async for idx in collection.list_search_indexes():
                existing.append(idx.get("name"))

            if index_name in existing:
                # Update existing index
                await collection.update_search_index(index_name, definition)
                print(f"Updated index '{index_name}' on '{collection_name}'")  # noqa: T201
            else:
                # Create new index
                model = {"name": index_name, "definition": definition}
                await collection.create_search_index(model)
                print(f"Created index '{index_name}' on '{collection_name}'")  # noqa: T201

        except Exception as e:
            print(f"Failed to create/update index '{index_name}' on '{collection_name}': {e}")  # noqa: T201
            sys.exit(1)

    client.close()
    print("All Atlas Search indexes created/updated successfully")  # noqa: T201


if __name__ == "__main__":
    asyncio.run(create_indexes())
