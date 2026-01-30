"""
Taxonomy Executor for Librarian AI Agent

Implements the taxonomy enforcement tools for the 5-axis classification system.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.models.content import Content
from app.models.content_taxonomy import (CONTENT_FORMATS, Audience,
                                         ContentSection, Genre,
                                         SectionSubcategory)
from app.models.librarian import LibrarianAction
from app.services.content_taxonomy_migration import (
    LEGACY_CATEGORY_TO_GENRE_MAP, LEGACY_CATEGORY_TO_SECTION_MAP,
    _determine_audience, _determine_content_format,
    _determine_section_from_category, _determine_topic_tags,
    _map_genres_to_ids)

logger = logging.getLogger(__name__)


async def execute_validate_taxonomy_compliance(
    content_id: str,
    audit_id: str = "",
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Validate that a content item has correct taxonomy assignments.
    """
    try:
        content = await Content.get(content_id)
        if not content:
            return {"success": False, "error": f"Content {content_id} not found"}

        violations = []
        warnings = []

        # Load reference data
        sections = {
            str(s.id): s
            for s in await ContentSection.find(
                ContentSection.is_active == True
            ).to_list()
        }
        genres = {
            str(g.id): g for g in await Genre.find(Genre.is_active == True).to_list()
        }
        audiences = {
            str(a.id): a
            for a in await Audience.find(Audience.is_active == True).to_list()
        }

        # Check section_ids
        section_ids = getattr(content, "section_ids", []) or []
        if not section_ids:
            violations.append(
                {
                    "field": "section_ids",
                    "issue": "missing",
                    "message": "Content has no section assignments",
                    "severity": "high",
                }
            )
        else:
            for sid in section_ids:
                if sid not in sections:
                    violations.append(
                        {
                            "field": "section_ids",
                            "issue": "invalid_reference",
                            "message": f"Section ID {sid} does not exist or is inactive",
                            "severity": "high",
                        }
                    )

        # Check primary_section_id
        primary_section_id = getattr(content, "primary_section_id", None)
        if not primary_section_id:
            violations.append(
                {
                    "field": "primary_section_id",
                    "issue": "missing",
                    "message": "Content has no primary section",
                    "severity": "high",
                }
            )
        elif primary_section_id not in sections:
            violations.append(
                {
                    "field": "primary_section_id",
                    "issue": "invalid_reference",
                    "message": f"Primary section ID {primary_section_id} does not exist or is inactive",
                    "severity": "high",
                }
            )
        elif section_ids and primary_section_id not in section_ids:
            violations.append(
                {
                    "field": "primary_section_id",
                    "issue": "not_in_sections",
                    "message": "Primary section is not in section_ids list",
                    "severity": "medium",
                }
            )

        # Check content_format
        content_format = getattr(content, "content_format", None)
        if content_format and content_format not in CONTENT_FORMATS:
            violations.append(
                {
                    "field": "content_format",
                    "issue": "invalid_value",
                    "message": f"Invalid content format: {content_format}. Must be one of: {CONTENT_FORMATS}",
                    "severity": "medium",
                }
            )
        elif not content_format:
            warnings.append(
                {
                    "field": "content_format",
                    "issue": "missing",
                    "message": "Content has no format specified",
                    "severity": "low",
                }
            )

        # Check audience_id
        audience_id = getattr(content, "audience_id", None)
        if audience_id and audience_id not in audiences:
            violations.append(
                {
                    "field": "audience_id",
                    "issue": "invalid_reference",
                    "message": f"Audience ID {audience_id} does not exist or is inactive",
                    "severity": "medium",
                }
            )
        elif not audience_id:
            warnings.append(
                {
                    "field": "audience_id",
                    "issue": "missing",
                    "message": "Content has no audience classification",
                    "severity": "low",
                }
            )

        # Check genre_ids
        genre_ids = getattr(content, "genre_ids", []) or []
        for gid in genre_ids:
            if gid not in genres:
                violations.append(
                    {
                        "field": "genre_ids",
                        "issue": "invalid_reference",
                        "message": f"Genre ID {gid} does not exist or is inactive",
                        "severity": "low",
                    }
                )

        # Check subcategory_ids
        subcategory_ids = getattr(content, "subcategory_ids", []) or []
        if subcategory_ids:
            subcategories = await SectionSubcategory.find().to_list()
            subcategory_map = {str(sc.id): sc for sc in subcategories}

            for scid in subcategory_ids:
                if scid not in subcategory_map:
                    violations.append(
                        {
                            "field": "subcategory_ids",
                            "issue": "invalid_reference",
                            "message": f"Subcategory ID {scid} does not exist",
                            "severity": "low",
                        }
                    )
                else:
                    sc = subcategory_map[scid]
                    if sc.section_id not in section_ids:
                        violations.append(
                            {
                                "field": "subcategory_ids",
                                "issue": "section_mismatch",
                                "message": f"Subcategory {sc.slug} belongs to section {sc.section_id} but content is not in that section",
                                "severity": "medium",
                            }
                        )

        is_compliant = len(violations) == 0

        return {
            "success": True,
            "content_id": content_id,
            "title": content.title,
            "is_compliant": is_compliant,
            "violations": violations,
            "warnings": warnings,
            "current_taxonomy": {
                "section_ids": section_ids,
                "primary_section_id": primary_section_id,
                "content_format": content_format,
                "audience_id": audience_id,
                "genre_ids": genre_ids,
                "subcategory_ids": subcategory_ids,
                "topic_tags": getattr(content, "topic_tags", []) or [],
            },
        }

    except Exception as e:
        logger.error(f"Error validating taxonomy for {content_id}: {e}")
        return {"success": False, "error": str(e)}


async def execute_suggest_taxonomy_classification(
    content_id: str,
    audit_id: str = "",
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Analyze content and suggest appropriate taxonomy classification.
    """
    try:
        content = await Content.get(content_id)
        if not content:
            return {"success": False, "error": f"Content {content_id} not found"}

        # Load reference data
        sections = await ContentSection.find(ContentSection.is_active == True).to_list()
        section_map = {s.slug: str(s.id) for s in sections}

        genres = await Genre.find(Genre.is_active == True).to_list()
        genre_map = {g.slug: str(g.id) for g in genres}

        audiences = await Audience.find(Audience.is_active == True).to_list()
        audience_map = {a.slug: str(a.id) for a in audiences}

        suggestions = {}
        reasoning = []

        # Determine section
        section_slug = _determine_section_from_category(content)
        if section_slug and section_slug in section_map:
            suggestions["section_ids"] = [section_map[section_slug]]
            suggestions["primary_section_id"] = section_map[section_slug]
            reasoning.append(
                f"Suggested section '{section_slug}' based on category '{content.category_name}'"
            )

        # Check for cross-listing opportunities
        if content.is_kids_content and section_slug != "kids" and "kids" in section_map:
            suggestions["section_ids"].append(section_map["kids"])
            reasoning.append("Added kids section due to is_kids_content flag")

        category_name = (content.category_name or "").lower()
        if any(kw in category_name for kw in ["יהדות", "judaism", "תורה"]):
            if section_slug != "judaism" and "judaism" in section_map:
                suggestions["section_ids"].append(section_map["judaism"])
                reasoning.append("Added judaism section due to category name")

        # Determine format
        content_format = _determine_content_format(content)
        if content_format:
            suggestions["content_format"] = content_format
            reasoning.append(
                f"Suggested format '{content_format}' based on is_series={content.is_series}, content_type={content.content_type}"
            )

        # Determine audience
        audience_slug = _determine_audience(content)
        if audience_slug and audience_slug in audience_map:
            suggestions["audience_id"] = audience_map[audience_slug]
            reasoning.append(
                f"Suggested audience '{audience_slug}' based on age_rating={getattr(content, 'age_rating', None)}, content_rating={getattr(content, 'content_rating', None)}"
            )

        # Map genres
        genre_ids = _map_genres_to_ids(content, genre_map)
        if genre_ids:
            suggestions["genre_ids"] = genre_ids
            reasoning.append(f"Mapped {len(genre_ids)} genres from existing genre data")

        # Determine topic tags
        topic_tags = _determine_topic_tags(content)
        if topic_tags:
            suggestions["topic_tags"] = topic_tags
            reasoning.append(f"Suggested {len(topic_tags)} topic tags")

        return {
            "success": True,
            "content_id": content_id,
            "title": content.title,
            "suggestions": suggestions,
            "reasoning": reasoning,
            "current_data": {
                "category_id": content.category_id,
                "category_name": content.category_name,
                "is_series": content.is_series,
                "is_kids_content": getattr(content, "is_kids_content", False),
                "content_type": content.content_type,
                "genre": content.genre,
                "genres": getattr(content, "genres", []),
            },
        }

    except Exception as e:
        logger.error(f"Error suggesting taxonomy for {content_id}: {e}")
        return {"success": False, "error": str(e)}


async def execute_apply_taxonomy_classification(
    content_id: str,
    section_ids: Optional[List[str]] = None,
    primary_section_id: Optional[str] = None,
    content_format: Optional[str] = None,
    audience_id: Optional[str] = None,
    genre_ids: Optional[List[str]] = None,
    topic_tags: Optional[List[str]] = None,
    subcategory_ids: Optional[List[str]] = None,
    audit_id: str = "",
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Apply taxonomy classification to a content item.
    """
    try:
        content = await Content.get(content_id)
        if not content:
            return {"success": False, "error": f"Content {content_id} not found"}

        update_data = {}
        changes = []

        if section_ids is not None:
            update_data["section_ids"] = section_ids
            changes.append(f"section_ids: {section_ids}")

        if primary_section_id is not None:
            update_data["primary_section_id"] = primary_section_id
            changes.append(f"primary_section_id: {primary_section_id}")

        if content_format is not None:
            if content_format not in CONTENT_FORMATS:
                return {
                    "success": False,
                    "error": f"Invalid content_format: {content_format}",
                }
            update_data["content_format"] = content_format
            changes.append(f"content_format: {content_format}")

        if audience_id is not None:
            update_data["audience_id"] = audience_id
            changes.append(f"audience_id: {audience_id}")

        if genre_ids is not None:
            update_data["genre_ids"] = genre_ids
            changes.append(f"genre_ids: {genre_ids}")

        if topic_tags is not None:
            update_data["topic_tags"] = topic_tags
            changes.append(f"topic_tags: {topic_tags}")

        if subcategory_ids is not None:
            update_data["subcategory_ids"] = subcategory_ids
            changes.append(f"subcategory_ids: {subcategory_ids}")

        if not update_data:
            return {"success": False, "error": "No fields to update"}

        update_data["updated_at"] = datetime.now(timezone.utc)

        if dry_run:
            logger.info(
                f"[DRY RUN] Would apply taxonomy to {content_id}: {update_data}"
            )
            return {
                "success": True,
                "dry_run": True,
                "content_id": content_id,
                "title": content.title,
                "changes": changes,
            }

        await content.set(update_data)

        # Log action
        if audit_id:
            action = LibrarianAction(
                audit_id=audit_id,
                action_type="apply_taxonomy",
                target_type="content",
                target_id=content_id,
                description=f"Applied taxonomy classification to '{content.title}'",
                details={
                    "changes": changes,
                    "update_data": {
                        k: str(v) for k, v in update_data.items() if k != "updated_at"
                    },
                },
            )
            await action.insert()

        logger.info(f"Applied taxonomy to {content_id}: {changes}")

        return {
            "success": True,
            "content_id": content_id,
            "title": content.title,
            "changes": changes,
        }

    except Exception as e:
        logger.error(f"Error applying taxonomy to {content_id}: {e}")
        return {"success": False, "error": str(e)}


async def execute_batch_migrate_taxonomy(
    batch_size: int = 50,
    section_filter: Optional[str] = None,
    audit_id: str = "",
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Migrate a batch of content items to new taxonomy.
    """
    try:
        if batch_size > 200:
            batch_size = 200

        # Load reference data
        sections = await ContentSection.find(ContentSection.is_active == True).to_list()
        section_map = {s.slug: str(s.id) for s in sections}

        genres = await Genre.find(Genre.is_active == True).to_list()
        genre_map = {g.slug: str(g.id) for g in genres}

        audiences = await Audience.find(Audience.is_active == True).to_list()
        audience_map = {a.slug: str(a.id) for a in audiences}

        # Find unmigrated content
        filter_query = {
            "$or": [
                {"section_ids": {"$exists": False}},
                {"section_ids": {"$size": 0}},
                {"primary_section_id": None},
                {"primary_section_id": {"$exists": False}},
            ]
        }

        content_items = await Content.find(filter_query).limit(batch_size).to_list()

        stats = {
            "total": len(content_items),
            "migrated": 0,
            "skipped": 0,
            "errors": 0,
        }
        migrated_items = []

        for content in content_items:
            try:
                # Determine section
                section_slug = _determine_section_from_category(content)

                if section_filter and section_slug != section_filter:
                    stats["skipped"] += 1
                    continue

                if not section_slug or section_slug not in section_map:
                    stats["skipped"] += 1
                    continue

                section_id = section_map[section_slug]

                update_data = {
                    "section_ids": [section_id],
                    "primary_section_id": section_id,
                    "updated_at": datetime.now(timezone.utc),
                }

                # Content format
                content_format = _determine_content_format(content)
                if content_format:
                    update_data["content_format"] = content_format

                # Audience
                audience_slug = _determine_audience(content)
                if audience_slug and audience_slug in audience_map:
                    update_data["audience_id"] = audience_map[audience_slug]

                # Genres
                genre_ids = _map_genres_to_ids(content, genre_map)
                if genre_ids:
                    update_data["genre_ids"] = genre_ids

                # Topic tags
                topic_tags = _determine_topic_tags(content)
                if topic_tags:
                    update_data["topic_tags"] = topic_tags

                if dry_run:
                    logger.info(
                        f"[DRY RUN] Would migrate {content.id} to section '{section_slug}'"
                    )
                else:
                    await content.set(update_data)

                stats["migrated"] += 1
                migrated_items.append(
                    {
                        "id": str(content.id),
                        "title": content.title,
                        "section": section_slug,
                    }
                )

            except Exception as e:
                logger.error(f"Error migrating {content.id}: {e}")
                stats["errors"] += 1

        # Log action
        if audit_id and not dry_run and stats["migrated"] > 0:
            action = LibrarianAction(
                audit_id=audit_id,
                action_type="batch_migrate_taxonomy",
                target_type="content",
                target_id="batch",
                description=f"Migrated {stats['migrated']} content items to new taxonomy",
                details={"stats": stats},
            )
            await action.insert()

        return {
            "success": True,
            "dry_run": dry_run,
            "stats": stats,
            "migrated_items": migrated_items[:20],  # Limit response size
        }

    except Exception as e:
        logger.error(f"Error in batch taxonomy migration: {e}")
        return {"success": False, "error": str(e)}


async def execute_get_taxonomy_summary(
    audit_id: str = "",
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Get a summary of the current taxonomy state.
    """
    try:
        # Section counts
        sections = await ContentSection.find(ContentSection.is_active == True).to_list()
        section_data = []
        for section in sections:
            section_id = str(section.id)
            count = await Content.find({"section_ids": section_id}).count()
            section_data.append(
                {
                    "id": section_id,
                    "slug": section.slug,
                    "name": section.name,
                    "content_count": count,
                }
            )

        # Genre counts
        genres = await Genre.find(Genre.is_active == True).to_list()
        genre_data = []
        for genre in genres:
            genre_id = str(genre.id)
            count = await Content.find({"genre_ids": genre_id}).count()
            genre_data.append(
                {
                    "id": genre_id,
                    "slug": genre.slug,
                    "name": genre.name,
                    "content_count": count,
                }
            )

        # Audience counts
        audiences = await Audience.find(Audience.is_active == True).to_list()
        audience_data = []
        for aud in audiences:
            aud_id = str(aud.id)
            count = await Content.find({"audience_id": aud_id}).count()
            audience_data.append(
                {
                    "id": aud_id,
                    "slug": aud.slug,
                    "name": aud.name,
                    "content_count": count,
                }
            )

        # Migration status
        total_content = await Content.count()
        migrated = await Content.find(
            {"section_ids": {"$exists": True, "$ne": []}}
        ).count()
        pending = total_content - migrated

        return {
            "success": True,
            "sections": section_data,
            "genres": genre_data,
            "audiences": audience_data,
            "migration_status": {
                "total_content": total_content,
                "migrated": migrated,
                "pending": pending,
                "percentage": round(
                    (migrated / total_content * 100) if total_content > 0 else 0, 2
                ),
            },
        }

    except Exception as e:
        logger.error(f"Error getting taxonomy summary: {e}")
        return {"success": False, "error": str(e)}


async def execute_list_taxonomy_violations(
    limit: int = 100,
    violation_type: str = "all",
    audit_id: str = "",
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Find content items that violate taxonomy rules.
    """
    try:
        violations = []

        # Load valid IDs
        valid_section_ids = {
            str(s.id)
            for s in await ContentSection.find(
                ContentSection.is_active == True
            ).to_list()
        }
        valid_genre_ids = {
            str(g.id) for g in await Genre.find(Genre.is_active == True).to_list()
        }
        valid_audience_ids = {
            str(a.id) for a in await Audience.find(Audience.is_active == True).to_list()
        }

        # Missing section
        if violation_type in ["missing_section", "all"]:
            missing_section = (
                await Content.find(
                    {
                        "$or": [
                            {"section_ids": {"$exists": False}},
                            {"section_ids": {"$size": 0}},
                            {"primary_section_id": None},
                            {"primary_section_id": {"$exists": False}},
                        ]
                    }
                )
                .limit(limit)
                .to_list()
            )

            for item in missing_section:
                violations.append(
                    {
                        "content_id": str(item.id),
                        "title": item.title,
                        "violation_type": "missing_section",
                        "message": "Content has no section assignments",
                    }
                )

        # Missing audience
        if violation_type in ["missing_audience", "all"] and len(violations) < limit:
            remaining = limit - len(violations)
            missing_audience = (
                await Content.find(
                    {
                        "section_ids": {"$exists": True, "$ne": []},
                        "$or": [
                            {"audience_id": None},
                            {"audience_id": {"$exists": False}},
                        ],
                    }
                )
                .limit(remaining)
                .to_list()
            )

            for item in missing_audience:
                violations.append(
                    {
                        "content_id": str(item.id),
                        "title": item.title,
                        "violation_type": "missing_audience",
                        "message": "Content has no audience classification",
                    }
                )

        # Invalid format
        if violation_type in ["invalid_format", "all"] and len(violations) < limit:
            remaining = limit - len(violations)
            invalid_format = (
                await Content.find(
                    {
                        "content_format": {
                            "$nin": [
                                None,
                                "movie",
                                "series",
                                "documentary",
                                "short",
                                "clip",
                            ]
                        }
                    }
                )
                .limit(remaining)
                .to_list()
            )

            for item in invalid_format:
                violations.append(
                    {
                        "content_id": str(item.id),
                        "title": item.title,
                        "violation_type": "invalid_format",
                        "message": f"Invalid content_format: {getattr(item, 'content_format', None)}",
                    }
                )

        return {
            "success": True,
            "violations": violations,
            "count": len(violations),
            "limit": limit,
            "violation_type_filter": violation_type,
        }

    except Exception as e:
        logger.error(f"Error listing taxonomy violations: {e}")
        return {"success": False, "error": str(e)}
