import json

import requests

print("🔍 Searching archive.org for public domain movies\n")

# Search for specific items on archive.org
search_queries = {
    "Night of the Living Dead (1968)": "night of the living dead 1968",
    "His Girl Friday (1940)": "his girl friday",
    "Nosferatu (1922)": "nosferatu 1922",
    "The Great Train Robbery (1903)": "great train robbery 1903",
}

working_items = {}

for title, query in search_queries.items():
    print(f"\n📽️ Searching for: {title}")

    try:
        # Search archive.org
        response = requests.get(
            "https://archive.org/advancedsearch.php",
            params={
                "q": f'"{query}" AND mediatype:movies',
                "output": "json",
                "rows": 5,
            },
            timeout=5,
        )

        if response.status_code == 200:
            data = response.json()
            docs = data.get("response", {}).get("docs", [])

            if docs:
                first_item = docs[0]
                identifier = first_item.get("identifier", "")
                print(f"   Found: {first_item.get('title', 'Unknown')}")
                print(f"   ID: {identifier}")

                # Try to construct direct download URL
                mp4_url = f"https://archive.org/download/{identifier}/{identifier}.mp4"
                print(f"   Trying: {mp4_url[:70]}...")

                # Verify it works
                head_response = requests.head(mp4_url, timeout=5, allow_redirects=True)
                if head_response.status_code == 200:
                    print(f"   ✅ WORKS!")
                    working_items[title] = mp4_url
                else:
                    # Try alternate naming
                    alt_url = f"https://archive.org/download/{identifier}/"
                    head_response = requests.head(alt_url, timeout=5)
                    if head_response.status_code == 200:
                        print(f"   ℹ️ Directory listing available")
                        working_items[title] = alt_url
                    else:
                        print(f"   ❌ HTTP {head_response.status_code}")
            else:
                print(f"   ❌ No results found")
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:50]}")

print("\n" + "=" * 80)
print(f"\nFound {len(working_items)} working items")
