from urllib.parse import urlparse

import requests
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["bayit_plus"]

print("🔍 TESTING ALL LIVE CHANNEL STREAMS\n")
print("=" * 80)

channels = list(
    db.live_channels.find({}, {"name": 1, "stream_url": 1}).sort("order", 1)
)

results = []
for ch in channels:
    name = ch["name"]
    url = ch["stream_url"]

    print(f"\n📺 {name}")
    print(f"   URL: {url}")

    try:
        # Test HEAD request
        response = requests.head(url, timeout=5, allow_redirects=True)
        http_status = response.status_code

        # Try GET if HEAD fails
        if http_status >= 400:
            response = requests.get(url, timeout=5, allow_redirects=True)
            http_status = response.status_code

        if http_status == 200:
            print(f"   ✅ HTTP {http_status} - ACCESSIBLE")
            results.append((name, "✅ WORKS", url))
        else:
            print(f"   ❌ HTTP {http_status} - NOT ACCESSIBLE")
            results.append((name, f"❌ HTTP {http_status}", url))

    except requests.exceptions.Timeout:
        print(f"   ⏱️ TIMEOUT - No response")
        results.append((name, "⏱️ TIMEOUT", url))
    except requests.exceptions.ConnectionError as e:
        print(f"   ❌ CONNECTION ERROR")
        results.append((name, "❌ CONNECTION ERROR", url))
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)[:50]}")
        results.append((name, f"❌ ERROR", url))

print("\n" + "=" * 80)
print("\nLIVE CHANNELS SUMMARY:\n")
for name, status, url in results:
    print(f"{status:<20} {name:<20} {url[:40]}...")

working = sum(1 for _, status, _ in results if "✅" in status)
print(f"\n{working}/{len(results)} channels working")

client.close()
