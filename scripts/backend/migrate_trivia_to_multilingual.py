#!/usr/bin/env python3
"""
Migrate existing trivia data to new multilingual schema.

Converts legacy schema (text_he, text_en, text_es) to new schema
(source_language + translations) while maintaining backward compatibility.

Usage:
    poetry run python scripts/migrate_trivia_to_multilingual.py [--dry-run] [--batch-size N]

Options:
    --dry-run       Preview changes without writing to database
    --batch-size N  Process N documents at a time (default: 100)
"""

import asyncio
import argparse
import sys
from pathlib import Path
from typing import Dict, Optional
from datetime import datetime, timezone

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.trivia import ContentTrivia, TriviaFactModel

logger = get_logger(__name__)


class TriviaDataMigrator:
    """Migrates trivia data from legacy to new multilingual schema."""

    def __init__(self, dry_run: bool = False, batch_size: int = 100):
        self.dry_run = dry_run
        self.batch_size = batch_size
        self.stats = {
            "total_trivia": 0,
            "migrated_trivia": 0,
            "already_new_schema": 0,
            "total_facts": 0,
            "migrated_facts": 0,
            "errors": 0,
        }

    def detect_source_language(self, fact: TriviaFactModel) -> str:
        """
        Detect source language from legacy fact.

        Heuristic:
        - If text_en exists and text matches text_en → source is English
        - If text_he exists and text matches text_he → source is Hebrew
        - Default to English (new generation default)
        """
        text_en = getattr(fact, "text_en", None)
        text_he = getattr(fact, "text_he", None)

        if text_en and fact.text == text_en:
            return "en"
        elif text_he and fact.text == text_he:
            return "he"
        # Default to English (new trivia is generated in English)
        return "en"

    def build_translations_dict(self, fact: TriviaFactModel) -> Dict[str, str]:
        """
        Build translations dictionary from legacy fields.

        Returns:
            Dict mapping language codes to translated text
        """
        translations = {}

        text_he = getattr(fact, "text_he", None)
        text_en = getattr(fact, "text_en", None)
        text_es = getattr(fact, "text_es", None)

        if text_he:
            translations["he"] = text_he
        if text_en:
            translations["en"] = text_en
        if text_es:
            translations["es"] = text_es

        return translations

    def migrate_fact(self, fact: TriviaFactModel) -> bool:
        """
        Migrate a single fact from legacy to new schema.

        Returns:
            True if fact was migrated, False if already new schema
        """
        # Check if already using new schema
        if fact.source_language and fact.translations:
            logger.debug(f"Fact {fact.fact_id} already using new schema")
            return False

        # Detect source language
        source_language = self.detect_source_language(fact)

        # Build translations dictionary
        translations = self.build_translations_dict(fact)

        # Update fact with new schema
        fact.source_language = source_language
        fact.translations = translations

        # Ensure text field contains source language text
        text_en = getattr(fact, "text_en", None)
        text_he = getattr(fact, "text_he", None)

        if source_language == "en" and text_en:
            fact.text = text_en
        elif source_language == "he" and text_he:
            fact.text = text_he

        logger.info(
            f"Migrated fact {fact.fact_id}",
            extra={
                "source_language": source_language,
                "translations": list(translations.keys()),
            },
        )

        return True

    async def migrate_trivia(self, trivia: ContentTrivia) -> bool:
        """
        Migrate a single trivia document.

        Returns:
            True if trivia was migrated, False if already new schema
        """
        migrated_count = 0
        total_facts = len(trivia.facts)

        for fact in trivia.facts:
            if self.migrate_fact(fact):
                migrated_count += 1
                self.stats["migrated_facts"] += 1

            self.stats["total_facts"] += 1

        if migrated_count == 0:
            logger.debug(
                f"Trivia {trivia.content_id} already using new schema"
            )
            self.stats["already_new_schema"] += 1
            return False

        # Update trivia document
        trivia.updated_at = datetime.now(timezone.utc)

        if not self.dry_run:
            await trivia.save()
            logger.info(
                f"Saved migrated trivia {trivia.content_id}",
                extra={
                    "content_id": trivia.content_id,
                    "migrated_facts": migrated_count,
                    "total_facts": total_facts,
                },
            )
        else:
            logger.info(
                f"[DRY RUN] Would save trivia {trivia.content_id}",
                extra={
                    "content_id": trivia.content_id,
                    "migrated_facts": migrated_count,
                    "total_facts": total_facts,
                },
            )

        self.stats["migrated_trivia"] += 1
        return True

    async def migrate_all(self):
        """Migrate all trivia documents in batches."""
        logger.info("Starting trivia migration to new multilingual schema")

        if self.dry_run:
            logger.warning("DRY RUN MODE - No changes will be saved to database")

        try:
            # Count total documents
            total_count = await ContentTrivia.count()
            self.stats["total_trivia"] = total_count

            logger.info(f"Found {total_count} trivia documents to process")

            # Process in batches
            batch_num = 0
            async for trivia in ContentTrivia.find_all():
                try:
                    await self.migrate_trivia(trivia)
                    batch_num += 1

                    if batch_num % self.batch_size == 0:
                        logger.info(
                            f"Processed {batch_num}/{total_count} trivia documents",
                            extra={
                                "migrated": self.stats["migrated_trivia"],
                                "already_new": self.stats["already_new_schema"],
                                "errors": self.stats["errors"],
                            },
                        )

                except Exception as e:
                    self.stats["errors"] += 1
                    logger.error(
                        f"Error migrating trivia {trivia.content_id}",
                        extra={"error": str(e), "content_id": trivia.content_id},
                        exc_info=True,
                    )

            # Final stats
            logger.info(
                "Migration complete",
                extra={
                    "total_trivia": self.stats["total_trivia"],
                    "migrated_trivia": self.stats["migrated_trivia"],
                    "already_new_schema": self.stats["already_new_schema"],
                    "total_facts": self.stats["total_facts"],
                    "migrated_facts": self.stats["migrated_facts"],
                    "errors": self.stats["errors"],
                    "dry_run": self.dry_run,
                },
            )

            return self.stats

        except Exception as e:
            logger.error(
                "Migration failed",
                extra={"error": str(e)},
                exc_info=True,
            )
            raise


async def main():
    """Main migration entry point."""
    parser = argparse.ArgumentParser(
        description="Migrate trivia data to new multilingual schema"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing to database",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Process N documents at a time (default: 100)",
    )
    args = parser.parse_args()

    # Initialize database connection
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[ContentTrivia],
    )

    # Run migration
    migrator = TriviaDataMigrator(
        dry_run=args.dry_run,
        batch_size=args.batch_size,
    )
    stats = await migrator.migrate_all()

    # Print summary
    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    print(f"Total trivia documents:        {stats['total_trivia']}")
    print(f"Migrated trivia documents:     {stats['migrated_trivia']}")
    print(f"Already using new schema:      {stats['already_new_schema']}")
    print(f"Total facts processed:         {stats['total_facts']}")
    print(f"Migrated facts:                {stats['migrated_facts']}")
    print(f"Errors:                        {stats['errors']}")
    print(f"Mode:                          {'DRY RUN' if args.dry_run else 'LIVE'}")
    print("=" * 60)

    if args.dry_run:
        print("\n⚠️  This was a DRY RUN - no changes were saved to database")
        print("Run without --dry-run to apply changes")
    else:
        print("\n✅ Migration complete - all changes saved to database")


if __name__ == "__main__":
    asyncio.run(main())
