"""
Admin Podcast Management Routes - CRUD operations for podcasts
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Request

from app.models.user import User
from app.models.content import Podcast, PodcastEpisode
from app.models.admin import Permission, AuditAction
from .admin_content_utils import has_permission, log_audit
from .admin_content_schemas import PodcastCreateRequest, PodcastUpdateRequest

router = APIRouter()

def _podcast_dict(p):
    return {
        "id": str(p.id),
        "title": p.title,
        "title_en": p.title_en,
        "title_es": p.title_es,
        "description": p.description,
        "description_en": p.description_en,
        "description_es": p.description_es,
        "author": p.author,
        "author_en": p.author_en,
        "author_es": p.author_es,
        "cover": p.cover,
        "category": p.category,
        "category_en": p.category_en,
        "category_es": p.category_es,
        "culture_id": p.culture_id,
        "rss_feed": p.rss_feed,
        "website": p.website,
        "episode_count": p.episode_count,
        "latest_episode_date": p.latest_episode_date.isoformat() if p.latest_episode_date else None,
        "is_active": p.is_active,
        "order": p.order,
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
    }

@router.get("/podcasts")
async def get_podcasts(search: Optional[str] = None, category: Optional[str] = None,
                       is_active: Optional[bool] = None, page: int = Query(default=1, ge=1),
                       page_size: int = Query(default=20, le=100),
                       current_user: User = Depends(has_permission(Permission.CONTENT_READ))):
    """Get all podcasts with filters."""
    query = Podcast.find()
    if search:
        query = query.find({"$or": [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"author": {"$regex": search, "$options": "i"}},
        ]})
    if category:
        query = query.find(Podcast.category == category)
    if is_active is not None:
        query = query.find(Podcast.is_active == is_active)
    total = await query.count()
    items = await query.sort(Podcast.order).skip((page - 1) * page_size).limit(page_size).to_list()
    return {
        "items": [_podcast_dict(item) for item in items],
        "total": total, "page": page, "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }

@router.get("/podcasts/{podcast_id}")
async def get_podcast(podcast_id: str, current_user: User = Depends(has_permission(Permission.CONTENT_READ))):
    """Get single podcast by ID."""
    try:
        podcast = await Podcast.get(podcast_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Podcast not found")
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    return _podcast_dict(podcast)

@router.post("/podcasts")
async def create_podcast(data: PodcastCreateRequest, request: Request,
                         current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))):
    """Create new podcast."""
    podcast = Podcast(
        title=data.title,
        title_en=getattr(data, 'title_en', None),
        title_es=getattr(data, 'title_es', None),
        description=data.description,
        description_en=getattr(data, 'description_en', None),
        description_es=getattr(data, 'description_es', None),
        author=data.author,
        author_en=getattr(data, 'author_en', None),
        author_es=getattr(data, 'author_es', None),
        cover=data.cover,
        category=data.category,
        category_en=getattr(data, 'category_en', None),
        category_es=getattr(data, 'category_es', None),
        culture_id=data.culture_id,
        rss_feed=data.rss_feed,
        website=data.website,
        episode_count=data.episode_count,
        latest_episode_date=data.latest_episode_date,
        is_active=data.is_active,
        order=data.order
    )
    await podcast.insert()
    await log_audit(str(current_user.id), AuditAction.PODCAST_CREATED, "podcast",
                    str(podcast.id), {"title": podcast.title, "author": podcast.author, "culture_id": podcast.culture_id}, request)
    return {"id": str(podcast.id), "title": podcast.title}

@router.patch("/podcasts/{podcast_id}")
async def update_podcast(podcast_id: str, data: PodcastUpdateRequest, request: Request,
                         current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE))):
    """Update podcast fields."""
    try:
        podcast = await Podcast.get(podcast_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Podcast not found")
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    changes = {}
    if data.title is not None:
        changes["title"] = {"old": podcast.title, "new": data.title}
        podcast.title = data.title
    if data.title_en is not None:
        podcast.title_en = data.title_en
    if data.title_es is not None:
        podcast.title_es = data.title_es
    if data.description is not None:
        changes["description"] = {"old": podcast.description, "new": data.description}
        podcast.description = data.description
    if data.description_en is not None:
        podcast.description_en = data.description_en
    if data.description_es is not None:
        podcast.description_es = data.description_es
    if data.author is not None:
        changes["author"] = {"old": podcast.author, "new": data.author}
        podcast.author = data.author
    if data.author_en is not None:
        podcast.author_en = data.author_en
    if data.author_es is not None:
        podcast.author_es = data.author_es
    if data.cover is not None:
        changes["cover"] = {"changed": True}
        podcast.cover = data.cover
    if data.category is not None:
        changes["category"] = {"old": podcast.category, "new": data.category}
        podcast.category = data.category
    if data.category_en is not None:
        podcast.category_en = data.category_en
    if data.category_es is not None:
        podcast.category_es = data.category_es
    if data.culture_id is not None:
        changes["culture_id"] = {"old": podcast.culture_id, "new": data.culture_id}
        podcast.culture_id = data.culture_id
    if data.rss_feed is not None:
        changes["rss_feed"] = {"changed": True}
        podcast.rss_feed = data.rss_feed
    if data.website is not None:
        changes["website"] = {"old": podcast.website, "new": data.website}
        podcast.website = data.website
    if data.episode_count is not None:
        changes["episode_count"] = {"old": podcast.episode_count, "new": data.episode_count}
        podcast.episode_count = data.episode_count
    if data.latest_episode_date is not None:
        changes["latest_episode_date"] = {"changed": True}
        podcast.latest_episode_date = data.latest_episode_date
    if data.is_active is not None:
        changes["is_active"] = {"old": podcast.is_active, "new": data.is_active}
        podcast.is_active = data.is_active
    if data.order is not None:
        changes["order"] = {"old": podcast.order, "new": data.order}
        podcast.order = data.order
    podcast.updated_at = datetime.utcnow()
    await podcast.save()
    await log_audit(str(current_user.id), AuditAction.PODCAST_UPDATED, "podcast", podcast_id, changes, request)
    return {"message": "Podcast updated", "id": podcast_id}

@router.delete("/podcasts/{podcast_id}")
async def delete_podcast(podcast_id: str, request: Request,
                         current_user: User = Depends(has_permission(Permission.CONTENT_DELETE))):
    """Delete podcast and all episodes."""
    try:
        podcast = await Podcast.get(podcast_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Podcast not found")
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    await PodcastEpisode.find(PodcastEpisode.podcast_id == podcast_id).delete()
    await log_audit(str(current_user.id), AuditAction.PODCAST_DELETED, "podcast", podcast_id,
                    {"title": podcast.title, "episodes_deleted": podcast.episode_count}, request)
    await podcast.delete()
    return {"message": "Podcast and all episodes deleted"}
