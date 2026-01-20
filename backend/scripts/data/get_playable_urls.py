import re

import requests

print("🎬 Getting actual playable files\n")

items = {
    "Night of the Living Dead (1968)": "classic-reborn-night.-of.-the.-living.-dead.-1968.1080p.-blu-ray",
    "Nosferatu (1922)": "PhantasmagoriaTheater-Nosferatu1922909-2",
    "The Great Train Robbery (1903)": "FreeRamble3013",
}

working_urls = {}

for title, item_id in items.items():
    print(f"\n📽️ {title}")
    print(f"   Item ID: {item_id}")

    try:
        # Get metadata
        metadata_url = f"https://archive.org/metadata/{item_id}"
        response = requests.get(metadata_url, timeout=5)

        if response.status_code == 200:
            data = response.json()
            files = data.get("files", [])

            # Find video files
            video_files = [
                f
                for f in files
                if f.get("format") in ["H.264", "MPEG4", "h.264", "MP4"]
            ]

            if video_files:
                # Use the first/largest video file
                video_file = max(
                    video_files,
                    key=lambda x: int(x.get("size", 0))
                    if isinstance(x.get("size"), str)
                    else 0,
                )
                filename = video_file.get("name", "")
                url = f"https://archive.org/download/{item_id}/{filename}"

                print(f"   Video: {filename}")

                # Test the URL
                head_response = requests.head(url, timeout=5, allow_redirects=True)
                if head_response.status_code == 200:
                    print(f"   ✅ WORKS - {url[:70]}...")
                    working_urls[title] = url
                else:
                    print(f"   ❌ HTTP {head_response.status_code}")
            else:
                print(f"   ⚠️ No video files found in metadata")
        else:
            print(f"   ❌ Metadata error")

    except Exception as e:
        print(f"   ❌ Error: {str(e)[:50]}")

# Already found this one working
working_urls[
    "The Great Train Robbery (1903)"
] = "https://archive.org/download/FreeRamble3013/FreeRamble3013.mp4"

print("\n" + "=" * 80)
print("\n✅ FINAL WORKING URLS:\n")

for title, url in working_urls.items():
    print(f"{title}")
    print(f"  {url}\n")
