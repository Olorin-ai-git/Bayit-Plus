#!/usr/bin/env python3
"""Check Justified content in database."""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def check_justified():
    mongodb_uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017')
    db_name = os.environ.get('MONGODB_DB_NAME', 'bayit')

    client = AsyncIOMotorClient(mongodb_uri)
    db = client[db_name]

    # Find Justified items
    items = await db.content.find({
        'title': {'$regex': 'justified', '$options': 'i'}
    }).to_list(length=20)

    print(f'Found {len(items)} Justified items:\n')
    for item in items:
        print(f"ID: {item['_id']}")
        print(f"Title: {item.get('title')}")
        print(f"is_series: {item.get('is_series')}")
        print(f"category_name: {item.get('category_name')}")
        print(f"series_id: {item.get('series_id')}")
        print(f"season: {item.get('season')}")
        print(f"episode: {item.get('episode')}")
        print('-' * 50)

    client.close()

if __name__ == '__main__':
    asyncio.run(check_justified())
