"""
Admin Taxonomy API Routes

Admin endpoints for managing the content classification system:
- Sections CRUD
- Subcategories CRUD
- Genres CRUD
- Audiences CRUD
- Migration operations
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.routes.admin_content_utils import log_audit
from app.core.security import get_current_active_user
from app.models.content_taxonomy import (Audience, AudienceCreate,
                                         AudienceUpdate, ContentSection,
                                         ContentSectionCreate,
                                         ContentSectionUpdate, Genre,
                                         GenreCreate, GenreUpdate,
                                         SectionSubcategory,
                                         SectionSubcategoryCreate,
                                         SectionSubcategoryUpdate)
from app.models.user import User
from app.services.content_taxonomy_migration import (get_migration_status,
                                                     run_full_migration,
                                                     seed_all_taxonomy)

router = APIRouter(prefix="/taxonomy", tags=["admin-taxonomy"])
logger = logging.getLogger(__name__)


# ============================================================================
# SECTIONS ADMIN ENDPOINTS
# ============================================================================


@router.get("/sections")
async def admin_list_sections(
    include_inactive: bool = Query(False, description="Include inactive sections"),
    current_user: User = Depends(get_current_active_user),
):
    """List all sections (admin view)."""
    filters = {} if include_inactive else {"is_active": True}
    sections = await ContentSection.find(filters).sort("order").to_list()

    return {
        "sections": [
            {
                "id": str(s.id),
                "slug": s.slug,
                "name": s.name,
                "name_en": s.name_en,
                "name_es": s.name_es,
                "description": s.description,
                "description_en": s.description_en,
                "description_es": s.description_es,
                "icon": s.icon,
                "thumbnail": s.thumbnail,
                "color": s.color,
                "order": s.order,
                "is_active": s.is_active,
                "show_on_homepage": s.show_on_homepage,
                "show_on_nav": s.show_on_nav,
                "supports_subcategories": s.supports_subcategories,
                "default_content_format": s.default_content_format,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            }
            for s in sections
        ],
        "total": len(sections),
    }


@router.get("/sections/{section_id}")
async def admin_get_section(
    section_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get a single section by ID or slug."""
    section = None
    try:
        section = await ContentSection.get(section_id)
    except Exception:
        pass

    if not section:
        section = await ContentSection.find_one(ContentSection.slug == section_id)

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    return {
        "id": str(section.id),
        "slug": section.slug,
        "name": section.name,
        "name_en": section.name_en,
        "name_es": section.name_es,
        "description": section.description,
        "description_en": section.description_en,
        "description_es": section.description_es,
        "icon": section.icon,
        "thumbnail": section.thumbnail,
        "color": section.color,
        "order": section.order,
        "is_active": section.is_active,
        "show_on_homepage": section.show_on_homepage,
        "show_on_nav": section.show_on_nav,
        "supports_subcategories": section.supports_subcategories,
        "default_content_format": section.default_content_format,
        "created_at": section.created_at.isoformat() if section.created_at else None,
        "updated_at": section.updated_at.isoformat() if section.updated_at else None,
    }


@router.post("/sections")
async def admin_create_section(
    data: ContentSectionCreate,
    current_user: User = Depends(get_current_active_user),
):
    """Create a new section."""
    # Check for duplicate slug
    existing = await ContentSection.find_one(ContentSection.slug == data.slug)
    if existing:
        raise HTTPException(
            status_code=400, detail="Section with this slug already exists"
        )

    section = ContentSection(**data.model_dump())
    await section.insert()

    await log_audit(
        action="create_section",
        resource_type="section",
        resource_id=str(section.id),
        user_id=str(current_user.id),
        details={"slug": section.slug, "name": section.name},
    )

    logger.info(f"Created section '{section.slug}' by user {current_user.id}")

    return {"id": str(section.id), "message": "Section created successfully"}


@router.patch("/sections/{section_id}")
async def admin_update_section(
    section_id: str,
    data: ContentSectionUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update a section."""
    section = await ContentSection.get(section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await section.set(update_data)

        await log_audit(
            action="update_section",
            resource_type="section",
            resource_id=section_id,
            user_id=str(current_user.id),
            details={"updated_fields": list(update_data.keys())},
        )

    return {"message": "Section updated successfully"}


@router.delete("/sections/{section_id}")
async def admin_delete_section(
    section_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Delete a section (soft delete by setting is_active=False)."""
    section = await ContentSection.get(section_id)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Soft delete
    await section.set({"is_active": False, "updated_at": datetime.now(timezone.utc)})

    await log_audit(
        action="delete_section",
        resource_type="section",
        resource_id=section_id,
        user_id=str(current_user.id),
        details={"slug": section.slug},
    )

    return {"message": "Section deleted successfully"}


@router.post("/sections/reorder")
async def admin_reorder_sections(
    order: list[dict],
    current_user: User = Depends(get_current_active_user),
):
    """Bulk reorder sections. Expects list of {id, order}."""
    for item in order:
        section = await ContentSection.get(item["id"])
        if section:
            await section.set({"order": item["order"], "updated_at": datetime.now(timezone.utc)})

    await log_audit(
        action="reorder_sections",
        resource_type="section",
        resource_id="bulk",
        user_id=str(current_user.id),
        details={"count": len(order)},
    )

    return {"message": f"Reordered {len(order)} sections"}


# ============================================================================
# SUBCATEGORIES ADMIN ENDPOINTS
# ============================================================================


@router.get("/subcategories")
async def admin_list_subcategories(
    section_id: Optional[str] = Query(None, description="Filter by section ID"),
    include_inactive: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
):
    """List all subcategories."""
    filters = {} if include_inactive else {"is_active": True}
    if section_id:
        filters["section_id"] = section_id

    subcategories = await SectionSubcategory.find(filters).sort("order").to_list()

    return {
        "subcategories": [
            {
                "id": str(s.id),
                "section_id": s.section_id,
                "slug": s.slug,
                "name": s.name,
                "name_en": s.name_en,
                "name_es": s.name_es,
                "description": s.description,
                "description_en": s.description_en,
                "description_es": s.description_es,
                "icon": s.icon,
                "thumbnail": s.thumbnail,
                "order": s.order,
                "is_active": s.is_active,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in subcategories
        ],
        "total": len(subcategories),
    }


@router.post("/subcategories")
async def admin_create_subcategory(
    data: SectionSubcategoryCreate,
    current_user: User = Depends(get_current_active_user),
):
    """Create a new subcategory."""
    # Verify section exists
    section = await ContentSection.get(data.section_id)
    if not section:
        raise HTTPException(status_code=400, detail="Section not found")

    # Check for duplicate slug within section
    existing = await SectionSubcategory.find_one(
        SectionSubcategory.section_id == data.section_id,
        SectionSubcategory.slug == data.slug,
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Subcategory with this slug already exists in this section",
        )

    subcategory = SectionSubcategory(**data.model_dump())
    await subcategory.insert()

    await log_audit(
        action="create_subcategory",
        resource_type="subcategory",
        resource_id=str(subcategory.id),
        user_id=str(current_user.id),
        details={"slug": subcategory.slug, "section_id": data.section_id},
    )

    return {"id": str(subcategory.id), "message": "Subcategory created successfully"}


@router.patch("/subcategories/{subcategory_id}")
async def admin_update_subcategory(
    subcategory_id: str,
    data: SectionSubcategoryUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update a subcategory."""
    subcategory = await SectionSubcategory.get(subcategory_id)
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        await subcategory.set(update_data)

        await log_audit(
            action="update_subcategory",
            resource_type="subcategory",
            resource_id=subcategory_id,
            user_id=str(current_user.id),
            details={"updated_fields": list(update_data.keys())},
        )

    return {"message": "Subcategory updated successfully"}


@router.delete("/subcategories/{subcategory_id}")
async def admin_delete_subcategory(
    subcategory_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Delete a subcategory (soft delete)."""
    subcategory = await SectionSubcategory.get(subcategory_id)
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    await subcategory.set({"is_active": False})

    await log_audit(
        action="delete_subcategory",
        resource_type="subcategory",
        resource_id=subcategory_id,
        user_id=str(current_user.id),
        details={"slug": subcategory.slug},
    )

    return {"message": "Subcategory deleted successfully"}


# ============================================================================
# GENRES ADMIN ENDPOINTS
# ============================================================================


@router.get("/genres")
async def admin_list_genres(
    include_inactive: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
):
    """List all genres."""
    filters = {} if include_inactive else {"is_active": True}
    genres = await Genre.find(filters).sort("order").to_list()

    return {
        "genres": [
            {
                "id": str(g.id),
                "slug": g.slug,
                "name": g.name,
                "name_en": g.name_en,
                "name_es": g.name_es,
                "tmdb_id": g.tmdb_id,
                "tmdb_name": g.tmdb_name,
                "icon": g.icon,
                "color": g.color,
                "order": g.order,
                "is_active": g.is_active,
                "show_in_filter": g.show_in_filter,
                "created_at": g.created_at.isoformat() if g.created_at else None,
            }
            for g in genres
        ],
        "total": len(genres),
    }


@router.post("/genres")
async def admin_create_genre(
    data: GenreCreate,
    current_user: User = Depends(get_current_active_user),
):
    """Create a new genre."""
    existing = await Genre.find_one(Genre.slug == data.slug)
    if existing:
        raise HTTPException(
            status_code=400, detail="Genre with this slug already exists"
        )

    genre = Genre(**data.model_dump())
    await genre.insert()

    await log_audit(
        action="create_genre",
        resource_type="genre",
        resource_id=str(genre.id),
        user_id=str(current_user.id),
        details={"slug": genre.slug, "name": genre.name},
    )

    return {"id": str(genre.id), "message": "Genre created successfully"}


@router.patch("/genres/{genre_id}")
async def admin_update_genre(
    genre_id: str,
    data: GenreUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update a genre."""
    genre = await Genre.get(genre_id)
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        await genre.set(update_data)

        await log_audit(
            action="update_genre",
            resource_type="genre",
            resource_id=genre_id,
            user_id=str(current_user.id),
            details={"updated_fields": list(update_data.keys())},
        )

    return {"message": "Genre updated successfully"}


@router.delete("/genres/{genre_id}")
async def admin_delete_genre(
    genre_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Delete a genre (soft delete)."""
    genre = await Genre.get(genre_id)
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")

    await genre.set({"is_active": False})

    await log_audit(
        action="delete_genre",
        resource_type="genre",
        resource_id=genre_id,
        user_id=str(current_user.id),
        details={"slug": genre.slug},
    )

    return {"message": "Genre deleted successfully"}


# ============================================================================
# AUDIENCES ADMIN ENDPOINTS
# ============================================================================


@router.get("/audiences")
async def admin_list_audiences(
    include_inactive: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
):
    """List all audience classifications."""
    filters = {} if include_inactive else {"is_active": True}
    audiences = await Audience.find(filters).sort("order").to_list()

    return {
        "audiences": [
            {
                "id": str(a.id),
                "slug": a.slug,
                "name": a.name,
                "name_en": a.name_en,
                "name_es": a.name_es,
                "description": a.description,
                "description_en": a.description_en,
                "description_es": a.description_es,
                "min_age": a.min_age,
                "max_age": a.max_age,
                "content_ratings": a.content_ratings,
                "icon": a.icon,
                "color": a.color,
                "order": a.order,
                "is_active": a.is_active,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in audiences
        ],
        "total": len(audiences),
    }


@router.post("/audiences")
async def admin_create_audience(
    data: AudienceCreate,
    current_user: User = Depends(get_current_active_user),
):
    """Create a new audience classification."""
    existing = await Audience.find_one(Audience.slug == data.slug)
    if existing:
        raise HTTPException(
            status_code=400, detail="Audience with this slug already exists"
        )

    audience = Audience(**data.model_dump())
    await audience.insert()

    await log_audit(
        action="create_audience",
        resource_type="audience",
        resource_id=str(audience.id),
        user_id=str(current_user.id),
        details={"slug": audience.slug, "name": audience.name},
    )

    return {"id": str(audience.id), "message": "Audience created successfully"}


@router.patch("/audiences/{audience_id}")
async def admin_update_audience(
    audience_id: str,
    data: AudienceUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update an audience classification."""
    audience = await Audience.get(audience_id)
    if not audience:
        raise HTTPException(status_code=404, detail="Audience not found")

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        await audience.set(update_data)

        await log_audit(
            action="update_audience",
            resource_type="audience",
            resource_id=audience_id,
            user_id=str(current_user.id),
            details={"updated_fields": list(update_data.keys())},
        )

    return {"message": "Audience updated successfully"}


@router.delete("/audiences/{audience_id}")
async def admin_delete_audience(
    audience_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Delete an audience classification (soft delete)."""
    audience = await Audience.get(audience_id)
    if not audience:
        raise HTTPException(status_code=404, detail="Audience not found")

    await audience.set({"is_active": False})

    await log_audit(
        action="delete_audience",
        resource_type="audience",
        resource_id=audience_id,
        user_id=str(current_user.id),
        details={"slug": audience.slug},
    )

    return {"message": "Audience deleted successfully"}


# ============================================================================
# MIGRATION ADMIN ENDPOINTS
# ============================================================================


@router.get("/migration/status")
async def admin_migration_status(
    current_user: User = Depends(get_current_active_user),
):
    """Get current migration status."""
    status = await get_migration_status()
    return status


@router.post("/migration/seed")
async def admin_seed_taxonomy(
    current_user: User = Depends(get_current_active_user),
):
    """Seed initial taxonomy data (sections, genres, audiences, subcategories)."""
    section_map, subcategory_map, genre_map, audience_map = await seed_all_taxonomy()

    await log_audit(
        action="seed_taxonomy",
        resource_type="taxonomy",
        resource_id="all",
        user_id=str(current_user.id),
        details={
            "sections": len(section_map),
            "subcategories": len(subcategory_map),
            "genres": len(genre_map),
            "audiences": len(audience_map),
        },
    )

    return {
        "message": "Taxonomy seeded successfully",
        "sections": len(section_map),
        "subcategories": len(subcategory_map),
        "genres": len(genre_map),
        "audiences": len(audience_map),
    }


@router.post("/migration/run")
async def admin_run_migration(
    dry_run: bool = Query(
        False, description="If True, only log changes without saving"
    ),
    current_user: User = Depends(get_current_active_user),
):
    """Run full taxonomy migration."""
    result = await run_full_migration(dry_run=dry_run)

    await log_audit(
        action="run_migration",
        resource_type="taxonomy",
        resource_id="migration",
        user_id=str(current_user.id),
        details={"dry_run": dry_run, "stats": result["migration_stats"]},
    )

    return result
