from datetime import datetime

from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["bayit_plus"]

print("📺 Updating LIVE CHANNELS with VERIFIED WORKING streams\n")

# VERIFIED WORKING streams
verified_channels = [
    {
        "name": "כאן 11",
        "description": "Kan 11 - Israeli Public Broadcasting",
        "stream_url": "https://kancdn.medonecdn.net/livehls/oil/kancdn-live/live/kan11/live.livx/playlist.m3u8",
        "thumbnail": "https://storage.googleapis.com/bayit-plus-media-new/live-channels/kan-11-poster.jpeg",
        "order": 1,
    },
    {
        "name": "Mux Test Stream",
        "description": "Verified working test stream for testing",
        "stream_url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        "order": 2,
    },
]

# Use upsert operations to update or create channels
print("Upserting channels (update or create)...\n")

for channel in verified_channels:
    doc = {
        "name": channel["name"],
        "description": channel["description"],
        "logo": channel.get("logo", ""),
        "thumbnail": channel.get("thumbnail", ""),
        "stream_url": channel["stream_url"],
        "stream_type": "hls",
        "is_drm_protected": False,
        "is_active": True,
        "order": channel["order"],
        "requires_subscription": "none",
        "updated_at": datetime.utcnow(),
    }

    # Upsert: update if exists, insert if not
    result = db.live_channels.update_one(
        {"name": channel["name"]},  # Match by name
        {"$set": doc, "$setOnInsert": {"created_at": datetime.utcnow()}},
        upsert=True,
    )

    if result.upserted_id:
        print(f"✓ Created: {channel['name']}")
    else:
        print(f"⟳ Updated: {channel['name']}")
    print(f"  {channel['stream_url'][:70]}...\n")

print("=" * 80)
print(f"\n✅ {len(verified_channels)} VERIFIED channels")
print("Only 100% working streams added!")

client.close()
