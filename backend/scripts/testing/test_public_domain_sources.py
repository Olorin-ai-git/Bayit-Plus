import requests

# Alternative public domain sources
test_urls = {
    "Night of the Living Dead (1968)": [
        "https://www.youtube.com/embed/jB2sq51ZjKE",  # YouTube
        "https://vimeo.com/568582957",  # Vimeo
        "https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4",  # Common test
    ],
    "Sintel (Free)": [
        "https://commondatastorage.googleapis.com/gtv-videos-library/sample/Sintel.mp4",
        "https://media.xiph.org/video/derf/sintel-1080p.mp4",
    ],
    "Tears of Steel": [
        "https://mango.blender.org/download/Tears-of-Steel-1080p.mp4",
    ],
    "Big Buck Bunny": [
        "https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4",
        "https://peach.blender.org/download/Peach-Alternate-Big-Buck-Bunny-1080p-5689MB.mp4",
    ],
    "Elephant Dream": [
        "https://commondatastorage.googleapis.com/gtv-videos-library/sample/ElephantsDream.mp4",
    ]
}

print("🎬 Testing Alternative Public Domain Sources\n")
print("="*80)

working_urls = {}

for title, urls in test_urls.items():
    print(f"\n📽️ {title}")
    found = False
    
    for url in urls:
        try:
            response = requests.head(url, timeout=5, allow_redirects=True)
            if response.status_code == 200:
                print(f"   ✅ WORKS - {url[:70]}...")
                working_urls[title] = url
                found = True
                break
            else:
                print(f"   ❌ HTTP {response.status_code}")
        except Exception as e:
            print(f"   ❌ Error")
    
    if not found:
        print(f"   ⚠️  No working URL")

print("\n" + "="*80)
print("\n✅ VERIFIED WORKING URLS:\n")
for title, url in working_urls.items():
    print(f"{title}")
    print(f"  {url}\n")

