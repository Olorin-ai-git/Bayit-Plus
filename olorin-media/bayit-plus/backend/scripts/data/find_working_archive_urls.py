import requests

# Test archive.org URLs for public domain movies
test_urls = {
    "Night of the Living Dead (1968)": [
        "https://archive.org/download/night_of_the_living_dead_1968/night_of_the_living_dead_1968.m3u8",
        "https://archive.org/download/notld_201509/notld_512kb.mp4",
        "https://ia800301.us.archive.org/20/items/night_of_the_living_dead_1968/night_of_the_living_dead_1968_512kb.mp4",
    ],
    "His Girl Friday (1940)": [
        "https://archive.org/download/HisGirlFriday/hgf_512kb.mp4",
        "https://ia800600.us.archive.org/23/items/HisGirlFriday/hgf_512kb.mp4",
        "https://archive.org/download/HisGirlFriday_1/HisGirlFriday_512kb.mp4",
    ],
    "Nosferatu (1922)": [
        "https://archive.org/download/Nosferatu_1922/Nosferatu_1922_512kb.mp4",
        "https://ia801506.us.archive.org/8/items/Nosferatu_1922/Nosferatu_1922_512kb.mp4",
        "https://archive.org/download/nosferatu_silent/nosferatu_512kb.mp4",
    ],
    "The Great Train Robbery (1903)": [
        "https://archive.org/download/TheGreatTrainRobbery/greattrainrobbery_512kb.mp4",
        "https://ia800200.us.archive.org/24/items/TheGreatTrainRobbery/greattrainrobbery_512kb.mp4",
        "https://archive.org/download/GreatTrainRobbery_1/GreatTrainRobbery_512kb.mp4",
    ],
}

print("🎬 Testing Archive.org URLs for public domain movies\n")
print("=" * 80)

working_urls = {}

for title, urls in test_urls.items():
    print(f"\n📽️ {title}")
    found = False

    for url in urls:
        try:
            response = requests.head(url, timeout=5, allow_redirects=True)
            if response.status_code == 200:
                print(f"   ✅ {url}")
                working_urls[title] = url
                found = True
                break
            else:
                print(f"   ❌ HTTP {response.status_code} - {url[:60]}...")
        except Exception as e:
            print(f"   ❌ Error - {url[:60]}...")

    if not found:
        print(f"   ⚠️  No working URL found")

print("\n" + "=" * 80)
print("\n✅ WORKING URLS:\n")
for title, url in working_urls.items():
    print(f"{title}")
    print(f"  {url}\n")
