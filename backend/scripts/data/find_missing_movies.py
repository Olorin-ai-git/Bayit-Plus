import requests
import json

print("🔍 Finding Nosferatu and His Girl Friday\n")

# More specific searches
searches = [
    ("Nosferatu", "nosferatu 1922 public domain", "Nosferatu (1922)"),
    ("His Girl Friday", "his girl friday 1940 public domain", "His Girl Friday (1940)")
]

working = {}

for title, query, display in searches:
    print(f"\n📽️ Searching: {display}")
    
    try:
        response = requests.get(
            "https://archive.org/advancedsearch.php",
            params={
                "q": query,
                "output": "json",
                "rows": 10
            },
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            docs = data.get("response", {}).get("docs", [])
            
            for doc in docs[:3]:  # Check first 3 results
                identifier = doc.get("identifier", "")
                title_found = doc.get("title", "")
                
                # Get metadata
                metadata_url = f"https://archive.org/metadata/{identifier}"
                meta_resp = requests.get(metadata_url, timeout=5)
                
                if meta_resp.status_code == 200:
                    meta_data = meta_resp.json()
                    files = meta_data.get("files", [])
                    
                    # Find video files
                    video_files = [f for f in files if f.get("format") in ["H.264", "MPEG4", "h.264", "MP4", "Matroska"]]
                    
                    if video_files:
                        video_file = video_files[0]
                        filename = video_file.get("name", "")
                        url = f"https://archive.org/download/{identifier}/{filename}"
                        
                        # Test it
                        head_resp = requests.head(url, timeout=5, allow_redirects=True)
                        if head_resp.status_code == 200:
                            print(f"   ✅ {title_found}")
                            print(f"      {url[:75]}...")
                            working[display] = url
                            break
            
            if display not in working:
                print(f"   ⚠️  No playable version found")
                
    except Exception as e:
        print(f"   ❌ Error: {str(e)[:40]}")

print("\n" + "="*80)
print("\nALL WORKING PUBLIC DOMAIN MOVIES:\n")

all_working = {
    "Night of the Living Dead (1968)": "https://archive.org/download/classic-reborn-night.-of.-the.-living.-dead.-1968.1080p.-blu-ray/Classic_Reborn_Night.Of.The.Living.Dead.1968.1080p.BluRay.mp4",
    "The Great Train Robbery (1903)": "https://archive.org/download/FreeRamble3013/FreeRamble3013.mp4"
}

all_working.update(working)

for title, url in all_working.items():
    print(f"✅ {title}")
    print(f"   {url}\n")

