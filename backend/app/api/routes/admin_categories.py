"""
Admin Section Management Routes

CRUD operations for content sections (new taxonomy system).
Replaces the legacy Category system.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel, Field

from app.models.user import User
from app.models.content import Content
from app.models.content_taxonomy import ContentSection, SectionSubcategory
from app.models.admin import Permission, AuditAction
from .admin_content_utils import has_permission, log_audit

router = APIRouter()


class SectionCreateRequest(BaseModel):
    """Request model for creating a section."""
    name: str = Field(..., min_length=1, max_length=100)
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    slug: str = Field(..., min_length=1, max_length=50, pattern=r'^[a-z0-9-]+$')
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    thumbnail: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    order: int = 0
    is_active: bool = True
    show_on_homepage: bool = True
    show_on_nav: bool = True
    supports_subcategories: bool = False
    default_content_format: Optional[str] = None


class SectionUpdateRequest(BaseModel):
    """Request model for updating a section."""
    name: Optional[str] = None
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    thumbnail: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
    show_on_homepage: Optional[bool] = None
    show_on_nav: Optional[bool] = None
    supports_subcategories: Optional[bool] = None
    default_content_format: Optional[str] = None


class SubcategoryCreateRequest(BaseModel):
    """Request model for creating a subcategory."""
    name: str = Field(..., min_length=1, max_length=100)
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    slug: str = Field(..., min_length=1, max_length=50, pattern=r'^[a-z0-9-]+$')
    description: Optional[str] = None
    order: int = 0
    is_active: bool = True


class SubcategoryUpdateRequest(BaseModel):
    """Request model for updating a subcategory."""
    name: Optional[str] = None
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/categories")
async def get_categories(
    is_active: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, le=500),
    current_user: User = Depends(has_permission(Permission.CONTENT_READ))
):
    """Get all sections with pagination (aliased as categories for backward compatibility)."""
    query = ContentSection.find()

    if is_active is not None:
        query = query.find(ContentSection.is_active == is_active)

    total = await query.count()
    skip = (page - 1) * page_size
    items = await query.sort(ContentSection.order).skip(skip).limit(page_size).to_list()

    result_items = []
    for item in items:
        content_count = await Content.find({"section_ids": str(item.id)}).count()
        result_items.append({
            "id": str(item.id),
            "name": item.name,
            "name_en": item.name_en,
            "name_es": item.name_es,
            "slug": item.slug,
            "description": item.description,
            "thumbnail": item.thumbnail,
            "icon": item.icon,
            "color": item.color,
            "order": item.order,
            "is_active": item.is_active,
            "show_on_homepage": item.show_on_homepage,
            "show_on_nav": item.show_on_nav,
            "supports_subcategories": item.supports_subcategories,
            "content_count": content_count,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        })

    return {
        "items": result_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/categories/{category_id}")
async def get_category(
    category_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_READ))
):
    """Get single section by ID."""
    try:
        section = await ContentSection.get(category_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Section not found")

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    subcategories = []
    if section.supports_subcategories:
        subcats = await SectionSubcategory.find(
            SectionSubcategory.section_id == str(section.id)
        ).sort("order").to_list()
        subcategories = [{
            "id": str(sub.id),
            "name": sub.name,
            "name_en": sub.name_en,
            "slug": sub.slug,
            "order": sub.order,
            "is_active": sub.is_active,
        } for sub in subcats]

    content_count = await Content.find({"section_ids": str(section.id)}).count()

    return {
        "id": str(section.id),
        "name": section.name,
        "name_en": section.name_en,
        "name_es": section.name_es,
        "slug": section.slug,
        "description": section.description,
        "description_en": section.description_en,
        "description_es": section.description_es,
        "thumbnail": section.thumbnail,
        "icon": section.icon,
        "color": section.color,
        "order": section.order,
        "is_active": section.is_active,
        "show_on_homepage": section.show_on_homepage,
        "show_on_nav": section.show_on_nav,
        "supports_subcategories": section.supports_subcategories,
        "default_content_format": section.default_content_format,
        "subcategories": subcategories,
        "content_count": content_count,
        "created_at": section.created_at.isoformat() if section.created_at else None,
    }


@router.post("/categories")
async def create_category(
    data: SectionCreateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """Create new section."""
    if await ContentSection.find_one(ContentSection.slug == data.slug):
        raise HTTPException(status_code=400, detail="Slug already exists")

    section = ContentSection(
        name=data.name,
        name_en=data.name_en,
        name_es=data.name_es,
        slug=data.slug,
        description=data.description,
        description_en=data.description_en,
        description_es=data.description_es,
        thumbnail=data.thumbnail,
        icon=data.icon,
        color=data.color,
        order=data.order,
        is_active=data.is_active,
        show_on_homepage=data.show_on_homepage,
        show_on_nav=data.show_on_nav,
        supports_subcategories=data.supports_subcategories,
        default_content_format=data.default_content_format,
    )
    await section.insert()

    await log_audit(
        str(current_user.id),
        AuditAction.CATEGORY_CREATED,
        "section",
        str(section.id),
        {"name": section.name, "slug": section.slug},
        request
    )

    return {"id": str(section.id), "name": section.name, "slug": section.slug}


@router.patch("/categories/{category_id}")
async def update_category(
    category_id: str,
    data: SectionUpdateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE))
):
    """Update section fields."""
    try:
        section = await ContentSection.get(category_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Section not found")

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    changes = {}

    if data.name is not None:
        changes["name"] = {"old": section.name, "new": data.name}
        section.name = data.name

    if data.name_en is not None:
        changes["name_en"] = {"old": section.name_en, "new": data.name_en}
        section.name_en = data.name_en

    if data.name_es is not None:
        changes["name_es"] = {"old": section.name_es, "new": data.name_es}
        section.name_es = data.name_es

    if data.slug is not None:
        existing = await ContentSection.find_one(ContentSection.slug == data.slug)
        if existing and str(existing.id) != category_id:
            raise HTTPException(status_code=400, detail="Slug already exists")
        changes["slug"] = {"old": section.slug, "new": data.slug}
        section.slug = data.slug

    if data.description is not None:
        changes["description"] = {"old": section.description, "new": data.description}
        section.description = data.description

    if data.description_en is not None:
        section.description_en = data.description_en

    if data.description_es is not None:
        section.description_es = data.description_es

    if data.thumbnail is not None:
        changes["thumbnail"] = {"changed": True}
        section.thumbnail = data.thumbnail

    if data.icon is not None:
        section.icon = data.icon

    if data.color is not None:
        section.color = data.color

    if data.order is not None:
        changes["order"] = {"old": section.order, "new": data.order}
        section.order = data.order

    if data.is_active is not None:
        changes["is_active"] = {"old": section.is_active, "new": data.is_active}
        section.is_active = data.is_active

    if data.show_on_homepage is not None:
        changes["show_on_homepage"] = {"old": section.show_on_homepage, "new": data.show_on_homepage}
        section.show_on_homepage = data.show_on_homepage

    if data.show_on_nav is not None:
        section.show_on_nav = data.show_on_nav

    if data.supports_subcategories is not None:
        section.supports_subcategories = data.supports_subcategories

    if data.default_content_format is not None:
        section.default_content_format = data.default_content_format

    await section.save()

    await log_audit(
        str(current_user.id),
        AuditAction.CATEGORY_UPDATED,
        "section",
        category_id,
        changes,
        request
    )

    return {"message": "Section updated", "id": category_id}


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE))
):
    """Delete section (fails if content exists)."""
    try:
        section = await ContentSection.get(category_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Section not found")

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    content_count = await Content.find({"section_ids": str(section.id)}).count()
    if content_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete section with {content_count} content items"
        )

    subcategory_count = await SectionSubcategory.find(
        SectionSubcategory.section_id == str(section.id)
    ).count()
    if subcategory_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete section with {subcategory_count} subcategories"
        )

    await log_audit(
        str(current_user.id),
        AuditAction.CATEGORY_DELETED,
        "section",
        category_id,
        {"name": section.name, "slug": section.slug},
        request
    )

    await section.delete()

    return {"message": "Section deleted"}


@router.post("/categories/reorder")
async def reorder_categories(
    order_data: dict,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE))
):
    """Reorder sections by dragging (bulk update)."""
    for section_id, pos in order_data.items():
        try:
            section = await ContentSection.get(section_id)
            if section:
                section.order = pos
                await section.save()
        except Exception:
            pass

    await log_audit(
        str(current_user.id),
        AuditAction.CATEGORY_UPDATED,
        "section",
        None,
        {"action": "bulk_reorder", "count": len(order_data)},
        request
    )

    return {"message": "Sections reordered"}


@router.get("/categories/{category_id}/subcategories")
async def get_subcategories(
    category_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_READ))
):
    """Get subcategories for a section."""
    try:
        section = await ContentSection.get(category_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Section not found")

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    subcats = await SectionSubcategory.find(
        SectionSubcategory.section_id == category_id
    ).sort("order").to_list()

    return {
        "section_id": category_id,
        "section_name": section.name,
        "subcategories": [{
            "id": str(sub.id),
            "name": sub.name,
            "name_en": sub.name_en,
            "name_es": sub.name_es,
            "slug": sub.slug,
            "description": sub.description,
            "order": sub.order,
            "is_active": sub.is_active,
        } for sub in subcats]
    }


@router.post("/categories/{category_id}/subcategories")
async def create_subcategory(
    category_id: str,
    data: SubcategoryCreateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """Create a subcategory under a section."""
    try:
        section = await ContentSection.get(category_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Section not found")

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    if not section.supports_subcategories:
        raise HTTPException(status_code=400, detail="Section does not support subcategories")

    existing = await SectionSubcategory.find_one(
        SectionSubcategory.section_id == category_id,
        SectionSubcategory.slug == data.slug
    )
    if existing:
        raise HTTPException(status_code=400, detail="Subcategory slug already exists")

    subcategory = SectionSubcategory(
        section_id=category_id,
        name=data.name,
        name_en=data.name_en,
        name_es=data.name_es,
        slug=data.slug,
        description=data.description,
        order=data.order,
        is_active=data.is_active,
    )
    await subcategory.insert()

    await log_audit(
        str(current_user.id),
        AuditAction.CATEGORY_CREATED,
        "subcategory",
        str(subcategory.id),
        {"name": subcategory.name, "section": section.name},
        request
    )

    return {"id": str(subcategory.id), "name": subcategory.name}


@router.patch("/subcategories/{subcategory_id}")
async def update_subcategory(
    subcategory_id: str,
    data: SubcategoryUpdateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE))
):
    """Update a subcategory."""
    try:
        subcategory = await SectionSubcategory.get(subcategory_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    if data.name is not None:
        subcategory.name = data.name
    if data.name_en is not None:
        subcategory.name_en = data.name_en
    if data.name_es is not None:
        subcategory.name_es = data.name_es
    if data.slug is not None:
        existing = await SectionSubcategory.find_one(
            SectionSubcategory.section_id == subcategory.section_id,
            SectionSubcategory.slug == data.slug
        )
        if existing and str(existing.id) != subcategory_id:
            raise HTTPException(status_code=400, detail="Slug already exists")
        subcategory.slug = data.slug
    if data.description is not None:
        subcategory.description = data.description
    if data.order is not None:
        subcategory.order = data.order
    if data.is_active is not None:
        subcategory.is_active = data.is_active

    await subcategory.save()

    await log_audit(
        str(current_user.id),
        AuditAction.CATEGORY_UPDATED,
        "subcategory",
        subcategory_id,
        {"name": subcategory.name},
        request
    )

    return {"message": "Subcategory updated", "id": subcategory_id}


@router.delete("/subcategories/{subcategory_id}")
async def delete_subcategory(
    subcategory_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE))
):
    """Delete a subcategory."""
    try:
        subcategory = await SectionSubcategory.get(subcategory_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    content_count = await Content.find({"subcategory_ids": subcategory_id}).count()
    if content_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete subcategory with {content_count} content items"
        )

    await log_audit(
        str(current_user.id),
        AuditAction.CATEGORY_DELETED,
        "subcategory",
        subcategory_id,
        {"name": subcategory.name},
        request
    )

    await subcategory.delete()

    return {"message": "Subcategory deleted"}
