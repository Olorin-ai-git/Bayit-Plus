"""
Admin Category Management Routes
CRUD operations for content categories
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Request

from app.models.user import User
from app.models.content import Content, Category
from app.models.admin import Permission, AuditAction
from .admin_content_utils import has_permission, log_audit
from .admin_content_schemas import CategoryCreateRequest, CategoryUpdateRequest

router = APIRouter()


@router.get("/categories")
async def get_categories(
    is_active: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, le=500),
    current_user: User = Depends(has_permission(Permission.CONTENT_READ))
):
    """Get all categories with pagination."""
    query = Category.find()

    if is_active is not None:
        query = query.find(Category.is_active == is_active)

    total = await query.count()
    skip = (page - 1) * page_size
    items = await query.sort(Category.order).skip(skip).limit(page_size).to_list()

    return {
        "items": [{
            "id": str(item.id), "name": item.name, "name_en": item.name_en, "slug": item.slug,
            "description": item.description, "thumbnail": item.thumbnail, "order": item.order,
            "is_active": item.is_active, "created_at": item.created_at.isoformat(),
        } for item in items],
        "total": total, "page": page, "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/categories/{category_id}")
async def get_category(category_id: str, current_user: User = Depends(has_permission(Permission.CONTENT_READ))):
    """Get single category by ID."""
    try:
        category = await Category.get(category_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Category not found")
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return {
        "id": str(category.id), "name": category.name, "name_en": category.name_en, "slug": category.slug,
        "description": category.description, "thumbnail": category.thumbnail, "order": category.order,
        "is_active": category.is_active, "created_at": category.created_at.isoformat(),
    }


@router.post("/categories")
async def create_category(data: CategoryCreateRequest, request: Request,
                          current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))):
    """Create new category."""
    if await Category.find_one(Category.slug == data.slug):
        raise HTTPException(status_code=400, detail="Slug already exists")
    category = Category(name=data.name, name_en=data.name_en, slug=data.slug,
        description=data.description, thumbnail=data.thumbnail, order=data.order, is_active=data.is_active)
    await category.insert()
    await log_audit(str(current_user.id), AuditAction.CATEGORY_CREATED, "category",
                    str(category.id), {"name": category.name, "slug": category.slug}, request)
    return {"id": str(category.id), "name": category.name, "slug": category.slug}


@router.patch("/categories/{category_id}")
async def update_category(category_id: str, data: CategoryUpdateRequest, request: Request,
                          current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE))):
    """Update category fields."""
    try:
        category = await Category.get(category_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Category not found")
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    changes = {}
    if data.name is not None:
        changes["name"] = {"old": category.name, "new": data.name}
        category.name = data.name
    if data.name_en is not None:
        changes["name_en"] = {"old": category.name_en, "new": data.name_en}
        category.name_en = data.name_en
    if data.slug is not None:
        if (existing := await Category.find_one(Category.slug == data.slug)) and str(existing.id) != category_id:
            raise HTTPException(status_code=400, detail="Slug already exists")
        changes["slug"] = {"old": category.slug, "new": data.slug}
        category.slug = data.slug
    if data.description is not None:
        changes["description"] = {"old": category.description, "new": data.description}
        category.description = data.description
    if data.thumbnail is not None:
        changes["thumbnail"] = {"changed": True}
        category.thumbnail = data.thumbnail
    if data.order is not None:
        changes["order"] = {"old": category.order, "new": data.order}
        category.order = data.order
    if data.is_active is not None:
        changes["is_active"] = {"old": category.is_active, "new": data.is_active}
        category.is_active = data.is_active
    await category.save()
    await log_audit(str(current_user.id), AuditAction.CATEGORY_UPDATED, "category", category_id, changes, request)
    return {"message": "Category updated", "id": category_id}


@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, request: Request,
                          current_user: User = Depends(has_permission(Permission.CONTENT_DELETE))):
    """Delete category (fails if content exists)."""
    try:
        category = await Category.get(category_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Category not found")
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if (content_count := await Content.find(Content.category_id == category_id).count()) > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {content_count} content items")
    await log_audit(str(current_user.id), AuditAction.CATEGORY_DELETED, "category", category_id,
                    {"name": category.name}, request)
    await category.delete()
    return {"message": "Category deleted"}

@router.post("/categories/reorder")
async def reorder_categories(order_data: dict, request: Request,
                             current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE))):
    """Reorder categories by dragging (bulk update)."""
    for cid, pos in order_data.items():
        try:
            if cat := await Category.get(cid):
                cat.order = pos
                await cat.save()
        except Exception:
            pass
    await log_audit(str(current_user.id), AuditAction.CATEGORY_UPDATED, "category", None,
                    {"action": "bulk_reorder", "count": len(order_data)}, request)
    return {"message": "Categories reordered"}
