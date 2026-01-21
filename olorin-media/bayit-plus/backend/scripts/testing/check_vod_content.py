import requests
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["bayit_plus"]

print("📽️ CHECKING ALL VOD CONTENT STREAMS\n")
print("=" * 80)

content = list(db.content.find({}, {"title": 1, "stream_url": 1, "year": 1}).limit(20))

print(f"Total VOD items: {db.content.count_documents({})}\n")

for c in content:
    title = c.get("title", "Unknown")
    year = c.get("year", "")
    url = c.get("stream_url", "NO URL")

    print(f"\n🎬 {title} ({year})")
    print(f"   URL: {url[:70]}...")

    if url.startswith("http"):
        try:
            response = requests.head(url, timeout=5, allow_redirects=True)
            status = response.status_code
            if status == 200:
                print(f"   ✅ HTTP {status} - WORKS")
            else:
                print(f"   ❌ HTTP {status}")
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)[:40]}")

client.close()
