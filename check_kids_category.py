#!/usr/bin/env python3
"""
Script to check kids category and content classification
"""
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.config import settings

async def check_kids_category():
    """Check kids category and content"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    
    print("=" * 80)
    print("KIDS CATEGORY ANALYSIS")
    print("=" * 80)
    
    # Find kids category
    kids_categories = await db.categories.find({
        "$or": [
            {"name": {"$regex": "kids", "$options": "i"}},
            {"name": {"$regex": "ילדים", "$options": "i"}},
            {"name": {"$regex": "children", "$options": "i"}},
            {"slug": {"$regex": "kids", "$options": "i"}},
            {"name_en": {"$regex": "kids", "$options": "i"}}
        ]
    }).to_list(length=None)
    
    print(f"\n✅ Found {len(kids_categories)} kids-related categories:")
    kids_category_ids = []
    for cat in kids_categories:
        print(f"   - {cat['name']} (ID: {cat['_id']}, slug: {cat.get('slug', 'N/A')})")
        kids_category_ids.append(str(cat['_id']))
    
    if not kids_category_ids:
        print("\n❌ NO KIDS CATEGORY FOUND!")
        print("   Creating kids category...")
        
        # Create kids category
        kids_cat = {
            "name": "ילדים",
            "name_en": "Kids",
            "name_es": "Niños",
            "slug": "kids",
            "description": "Content for children",
            "is_active": True,
            "order": 5
        }
        result = await db.categories.insert_one(kids_cat)
        kids_category_ids.append(str(result.inserted_id))
        print(f"   ✅ Created kids category with ID: {result.inserted_id}")
    
    # Count content in kids categories
    print(f"\n📊 Content in kids categories:")
    for cat_id in kids_category_ids:
        count = await db.content.count_documents({"category_id": cat_id})
        print(f"   Category {cat_id}: {count} items")
    
    # Find all categories
    print(f"\n📂 All categories:")
    all_cats = await db.categories.find({}).to_list(length=None)
    for cat in all_cats:
        count = await db.content.count_documents({"category_id": str(cat['_id'])})
        print(f"   - {cat['name']} ({cat.get('slug', 'N/A')}): {count} items")
    
    # Find potential kids content that might be miscategorized
    print(f"\n🔍 Searching for potential kids content...")
    
    kids_keywords = [
        "sesame", "elmo", "kids", "children", "ילדים", "disney", "pixar",
        "cartoon", "animation", "animated", "דיסני", "הרפתקה", "אנימציה",
        "פיקסר", "dreamworks", "nickelodeon", "baby", "toddler", "preschool"
    ]
    
    regex_pattern = "|".join(kids_keywords)
    potential_kids = await db.content.find({
        "$or": [
            {"title": {"$regex": regex_pattern, "$options": "i"}},
            {"description": {"$regex": regex_pattern, "$options": "i"}},
            {"genre": {"$regex": regex_pattern, "$options": "i"}},
        ],
        "category_id": {"$nin": kids_category_ids}  # Not in kids category
    }).limit(10).to_list(length=None)
    
    print(f"   Found {len(potential_kids)} potential kids content items NOT in kids category:")
    for item in potential_kids:
        cat = await db.categories.find_one({"_id": ObjectId(item['category_id'])})
        cat_name = cat['name'] if cat else 'Unknown'
        print(f"   - '{item['title']}' (Current: {cat_name}, ID: {item['_id']})")
        if item.get('genre'):
            print(f"     Genre: {item['genre']}")
    
    # Stats
    total_content = await db.content.count_documents({})
    print(f"\n📈 Statistics:")
    print(f"   Total content items: {total_content}")
    print(f"   Kids category items: {sum([await db.content.count_documents({'category_id': cid}) for cid in kids_category_ids])}")
    print(f"   Potential misclassified: {len(potential_kids)}")
    
    await client.close()
    print("\n" + "=" * 80)

if __name__ == "__main__":
    asyncio.run(check_kids_category())
