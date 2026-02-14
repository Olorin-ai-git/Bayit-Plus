#!/usr/bin/env python3
"""
Complete HLS Subtitle Generator for Apple TV/AirPlay Casting

Features:
1. Generates AI-enhanced subtitle tracks (Heblish, Engrew, Shoresh, Nikud, Slang)
2. Creates merged dual-language tracks
3. Generates HLS subtitle playlists (.m3u8) for Apple TV compatibility
4. Uploads all files to Google Cloud Storage
5. Updates master.m3u8 manifest
6. Updates MongoDB with cache-busted URL

Usage:
    python scripts/generate_hls_subtitles.py <content_id> [--ai] [--gcs-bucket BUCKET] [--gcs-path PATH]

Arguments:
    content_id          MongoDB content ID (e.g., 6965398bb0b67350385e6e0b)
    --ai                Generate AI-enhanced tracks (Heblish, Engrew, Shoresh, Nikud, Slang)
    --gcs-bucket        GCS bucket name (default: bayit-plus-media-new)
    --gcs-path          GCS path prefix (default: movies/{title}/hls/)

Examples:
    # Standard tracks only
    python scripts/generate_hls_subtitles.py 6965398bb0b67350385e6e0b

    # With AI tracks
    python scripts/generate_hls_subtitles.py 6965398bb0b67350385e6e0b --ai

    # Custom GCS location
    python scripts/generate_hls_subtitles.py 6965398bb0b67350385e6e0b --ai --gcs-path series/MyShow/season1/
"""

import asyncio
import argparse
import sys
from pathlib import Path
from typing import List, Dict
from datetime import datetime
import subprocess
import tempfile

# Add backend directory to Python path
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from app.core.config import settings
from app.services.heblish_service import convert_to_heblish_batch
from app.services.engrew_service import convert_to_engrew_batch
from app.services.shoresh_service import extract_shoresh_batch
from app.services.nikud_service import add_nikud
from app.services.slang_synthesis_service import convert_to_slang_synthesis_batch


class HLSSubtitleGenerator:
    """Generates HLS-compatible subtitle tracks with AI enhancements."""

    def __init__(self, content_id: str, gcs_bucket: str, gcs_path: str, generate_ai: bool = False):
        self.content_id = content_id
        self.gcs_bucket = gcs_bucket
        self.gcs_path = gcs_path
        self.generate_ai = generate_ai
        self.temp_dir = Path(tempfile.mkdtemp(prefix='hls_subs_'))
        self.subtitles_data = {}

    def parse_vtt(self, vtt_content: str) -> List[Dict]:
        """Parse VTT file into list of cues."""
        cues = []
        lines = vtt_content.strip().split('\n')
        i = 0

        while i < len(lines):
            if lines[i].startswith('WEBVTT') or not lines[i].strip():
                i += 1
                continue

            if lines[i].strip().isdigit():
                cue_num = int(lines[i].strip())
                i += 1

                if i < len(lines) and '-->' in lines[i]:
                    timestamp = lines[i].strip()
                    i += 1

                    cue_text_lines = []
                    while i < len(lines) and lines[i].strip() and not lines[i].strip().isdigit():
                        cue_text_lines.append(lines[i].strip())
                        i += 1

                    cue_text = '\n'.join(cue_text_lines)
                    if cue_text:
                        cues.append({
                            'number': cue_num,
                            'timestamp': timestamp,
                            'text': cue_text
                        })
            else:
                i += 1

        return cues

    def write_vtt(self, cues: List[Dict], output_path: Path):
        """Write cues to VTT file."""
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('WEBVTT\n\n')
            for cue in cues:
                f.write(f"{cue['number']}\n")
                f.write(f"{cue['timestamp']}\n")
                f.write(f"{cue['text']}\n\n")

    def create_subtitle_playlist(self, vtt_filename: str, output_path: Path):
        """Create HLS subtitle playlist (.m3u8) for a VTT file."""
        content = f"""#EXTM3U
#EXT-X-TARGETDURATION:3600
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:3600.000,
{vtt_filename}
#EXT-X-ENDLIST
"""
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)

    async def process_in_chunks(self, texts: List[str], batch_func, chunk_size: int, name: str) -> List[str]:
        """Process texts in chunks to avoid timeouts."""
        results = []
        total_chunks = (len(texts) + chunk_size - 1) // chunk_size

        for i in range(0, len(texts), chunk_size):
            chunk = texts[i:i+chunk_size]
            chunk_num = i // chunk_size + 1
            print(f"   Chunk {chunk_num}/{total_chunks}: {len(chunk)} cues...")

            try:
                chunk_results = await batch_func(chunk)
                results.extend(chunk_results)
            except Exception as e:
                print(f"   ⚠️  Chunk {chunk_num} failed: {e}, using original text")
                results.extend(chunk)

        return results

    async def fetch_subtitles_from_db(self):
        """Fetch subtitle tracks from MongoDB."""
        print("\n📦 Fetching subtitles from database...")

        client = AsyncIOMotorClient(str(settings.MONGODB_URI))
        db = client[settings.MONGODB_DB_NAME]

        # Get content
        content = await db.content.find_one({'_id': ObjectId(self.content_id)})
        if not content:
            raise ValueError(f"Content {self.content_id} not found")

        self.content_title = content.get('title', 'unknown')
        print(f"   ✅ Content: {self.content_title}")

        # Fetch subtitle tracks
        cursor = db.subtitle_tracks.find({'content_id': self.content_id})
        tracks = await cursor.to_list(length=None)

        for track in tracks:
            lang = track.get('language')
            cues = track.get('cues', [])
            if lang and cues:
                self.subtitles_data[lang] = cues
                print(f"   ✅ {lang}: {len(cues)} cues")

        client.close()

        if not self.subtitles_data:
            raise ValueError(f"No subtitles found for content {self.content_id}")

    def seconds_to_vtt_timestamp(self, seconds: float) -> str:
        """Convert seconds to VTT timestamp format (HH:MM:SS.mmm)."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"

    async def generate_standard_tracks(self):
        """Generate standard subtitle VTT files."""
        print("\n📝 Generating standard subtitle tracks...")

        for lang, cues in self.subtitles_data.items():
            vtt_cues = [
                {
                    'number': i+1,
                    'timestamp': f"{self.seconds_to_vtt_timestamp(cue['start_time'])} --> {self.seconds_to_vtt_timestamp(cue['end_time'])}",
                    'text': cue['text']
                }
                for i, cue in enumerate(cues)
            ]

            vtt_path = self.temp_dir / f'subtitles_{lang}.vtt'
            self.write_vtt(vtt_cues, vtt_path)
            print(f"   ✅ {lang}: {len(vtt_cues)} cues → {vtt_path.name}")

    async def generate_ai_tracks(self):
        """Generate AI-enhanced subtitle tracks."""
        if not self.generate_ai:
            print("\n⏭️  Skipping AI tracks (--ai not specified)")
            return

        print("\n🤖 Generating AI-enhanced tracks...")

        # Hebrew AI tracks
        if 'he' in self.subtitles_data:
            hebrew_texts = [cue['text'] for cue in self.subtitles_data['he']]
            hebrew_cues_base = [
                {'number': i+1, 'timestamp': f"{self.seconds_to_vtt_timestamp(cue['start_time'])} --> {self.seconds_to_vtt_timestamp(cue['end_time'])}"}
                for i, cue in enumerate(self.subtitles_data['he'])
            ]

            # 1. Heblish
            print("\n1️⃣  Heblish (Hebrew → English transliteration)")
            heblish_texts = await self.process_in_chunks(hebrew_texts, convert_to_heblish_batch, 50, "Heblish")
            heblish_cues = [
                {**hebrew_cues_base[i], 'text': heblish_texts[i]}
                for i in range(len(hebrew_cues_base))
            ]
            self.write_vtt(heblish_cues, self.temp_dir / 'subtitles_heblish.vtt')
            print(f"   ✅ Heblish: {len(heblish_cues)} cues")

            # 2. Shoresh
            print("\n2️⃣  Shoresh (root words)")
            shoresh_texts = await self.process_in_chunks(hebrew_texts, extract_shoresh_batch, 50, "Shoresh")
            shoresh_cues = [
                {**hebrew_cues_base[i], 'text': shoresh_texts[i]}
                for i in range(len(hebrew_cues_base))
            ]
            self.write_vtt(shoresh_cues, self.temp_dir / 'subtitles_shoresh.vtt')
            print(f"   ✅ Shoresh: {len(shoresh_cues)} cues")

            # 3. Slang
            print("\n3️⃣  Slang (modern Hebrew)")
            slang_texts = await self.process_in_chunks(hebrew_texts, convert_to_slang_synthesis_batch, 50, "Slang")
            slang_cues = [
                {**hebrew_cues_base[i], 'text': slang_texts[i]}
                for i in range(len(hebrew_cues_base))
            ]
            self.write_vtt(slang_cues, self.temp_dir / 'subtitles_slang.vtt')
            print(f"   ✅ Slang: {len(slang_cues)} cues")

            # 4. Nikud (slow, one-by-one)
            print("\n4️⃣  Nikud (vowel marks) - ⚠️  Slow (~20 min)")
            nikud_cues = []
            for i, text in enumerate(hebrew_texts):
                if (i + 1) % 100 == 0:
                    print(f"   Progress: {i+1}/{len(hebrew_texts)} ({(i+1)*100/len(hebrew_texts):.0f}%)")
                nikud_text = await add_nikud(text)
                nikud_cues.append({**hebrew_cues_base[i], 'text': nikud_text})
            self.write_vtt(nikud_cues, self.temp_dir / 'subtitles_nikud.vtt')
            print(f"   ✅ Nikud: {len(nikud_cues)} cues")

        # English AI tracks
        if 'en' in self.subtitles_data:
            english_texts = [cue['text'] for cue in self.subtitles_data['en']]
            english_cues_base = [
                {'number': i+1, 'timestamp': f"{self.seconds_to_vtt_timestamp(cue['start_time'])} --> {self.seconds_to_vtt_timestamp(cue['end_time'])}"}
                for i, cue in enumerate(self.subtitles_data['en'])
            ]

            # 5. Engrew (English → Hebrew-style transliteration)
            print("\n5️⃣  Engrew (English transliteration)")
            engrew_texts = await self.process_in_chunks(english_texts, convert_to_engrew_batch, 50, "Engrew")
            engrew_cues = [
                {**english_cues_base[i], 'text': engrew_texts[i]}
                for i in range(len(english_cues_base))
            ]
            self.write_vtt(engrew_cues, self.temp_dir / 'subtitles_engrew.vtt')
            print(f"   ✅ Engrew: {len(engrew_cues)} cues")

    def generate_merged_tracks(self):
        """Generate merged dual-language tracks."""
        print("\n🔀 Generating merged dual-language tracks...")

        # Define language pairs for merging
        pairs = []

        # Hebrew combinations
        if 'he' in self.subtitles_data:
            if 'en' in self.subtitles_data:
                pairs.append(('he', 'en', 'Hebrew + English'))
            if 'es' in self.subtitles_data:
                pairs.append(('he', 'es', 'Hebrew + Spanish'))

        # AI track combinations (if AI enabled)
        if self.generate_ai:
            if (self.temp_dir / 'subtitles_heblish.vtt').exists() and 'en' in self.subtitles_data:
                pairs.append(('heblish', 'en', 'Heblish + English'))
            if (self.temp_dir / 'subtitles_nikud.vtt').exists() and 'en' in self.subtitles_data:
                pairs.append(('nikud', 'en', 'Nikud + English'))
            if (self.temp_dir / 'subtitles_shoresh.vtt').exists() and 'en' in self.subtitles_data:
                pairs.append(('shoresh', 'en', 'Shoresh + English'))
            if (self.temp_dir / 'subtitles_slang.vtt').exists() and 'en' in self.subtitles_data:
                pairs.append(('slang', 'en', 'Slang + English'))
            if (self.temp_dir / 'subtitles_engrew.vtt').exists() and 'he' in self.subtitles_data:
                pairs.append(('engrew', 'he', 'Engrew + Hebrew'))

        for lang1, lang2, label in pairs:
            file1 = self.temp_dir / f'subtitles_{lang1}.vtt'
            file2 = self.temp_dir / f'subtitles_{lang2}.vtt'

            if not file1.exists() or not file2.exists():
                continue

            with open(file1, 'r', encoding='utf-8') as f:
                cues1 = self.parse_vtt(f.read())
            with open(file2, 'r', encoding='utf-8') as f:
                cues2 = self.parse_vtt(f.read())

            merged_cues = [
                {**cues1[i], 'text': f"{cues1[i]['text']}\n{cues2[i]['text']}"}
                for i in range(min(len(cues1), len(cues2)))
            ]

            output_path = self.temp_dir / f'subtitles_{lang1}+{lang2}.vtt'
            self.write_vtt(merged_cues, output_path)
            print(f"   ✅ {label}: {len(merged_cues)} cues")

    def generate_subtitle_playlists(self):
        """Generate HLS subtitle playlists (.m3u8) for all VTT files."""
        print("\n📺 Generating HLS subtitle playlists for Apple TV...")

        vtt_files = list(self.temp_dir.glob('subtitles_*.vtt'))

        for vtt_file in vtt_files:
            playlist_name = vtt_file.stem + '.m3u8'
            playlist_path = self.temp_dir / playlist_name
            self.create_subtitle_playlist(vtt_file.name, playlist_path)
            print(f"   ✅ {playlist_name}")

        print(f"\n   Total: {len(vtt_files)} playlists generated")

    def upload_to_gcs(self):
        """Upload all subtitle files to Google Cloud Storage."""
        print(f"\n☁️  Uploading to GCS: gs://{self.gcs_bucket}/{self.gcs_path}")

        # Upload VTT files
        vtt_files = list(self.temp_dir.glob('subtitles_*.vtt'))
        for vtt_file in vtt_files:
            gcs_uri = f'gs://{self.gcs_bucket}/{self.gcs_path}{vtt_file.name}'
            subprocess.run([
                'gsutil', '-h', 'Cache-Control:no-cache, no-store, must-revalidate',
                '-h', 'Content-Type:text/vtt',
                '-h', 'Access-Control-Allow-Origin:*',
                'cp', str(vtt_file), gcs_uri
            ], check=True, capture_output=True)
            print(f"   ✅ {vtt_file.name}")

        # Upload playlist files
        m3u8_files = list(self.temp_dir.glob('subtitles_*.m3u8'))
        for m3u8_file in m3u8_files:
            gcs_uri = f'gs://{self.gcs_bucket}/{self.gcs_path}{m3u8_file.name}'
            subprocess.run([
                'gsutil', '-h', 'Cache-Control:no-cache, no-store, must-revalidate',
                '-h', 'Content-Type:application/vnd.apple.mpegurl',
                'cp', str(m3u8_file), gcs_uri
            ], check=True, capture_output=True)
            print(f"   ✅ {m3u8_file.name}")

        print(f"\n   Total: {len(vtt_files)} VTT + {len(m3u8_files)} playlists uploaded")

    def generate_master_manifest(self) -> str:
        """Generate HLS master manifest with all subtitle tracks."""
        print("\n📋 Generating master manifest...")

        manifest = "#EXTM3U\n#EXT-X-VERSION:3\n\n"

        # Get all subtitle playlists
        m3u8_files = sorted(self.temp_dir.glob('subtitles_*.m3u8'))

        # Language labels
        labels = {
            'en': 'English', 'es': 'Spanish', 'he': 'Hebrew',
            'da': 'Danish', 'de': 'German', 'et': 'Estonian',
            'fi': 'Finnish', 'fr': 'French', 'hu': 'Hungarian',
            'id': 'Indonesian', 'heblish': 'Heblish',
            'engrew': 'Engrew', 'nikud': 'Hebrew (Nikud)',
            'shoresh': 'Shoresh', 'slang': 'Slang',
            'he+en': 'Hebrew + English', 'he+es': 'Hebrew + Spanish',
            'heblish+en': 'Heblish + English', 'nikud+en': 'Nikud + English',
            'shoresh+en': 'Shoresh + English', 'slang+en': 'Slang + English',
            'engrew+he': 'Engrew + Hebrew',
        }

        for m3u8_file in m3u8_files:
            track_code = m3u8_file.stem.replace('subtitles_', '')
            label = labels.get(track_code, track_code.upper())
            lang_code = track_code.split('+')[0] if '+' in track_code else track_code

            manifest += (
                f'#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",'
                f'NAME="{label}",DEFAULT=NO,AUTOSELECT=NO,FORCED=NO,'
                f'LANGUAGE="{lang_code}",'
                f'CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog",'
                f'URI="https://storage.googleapis.com/{self.gcs_bucket}/{self.gcs_path}{m3u8_file.name}"\n'
            )

        manifest += '\n#EXT-X-STREAM-INF:BANDWIDTH=5000000,SUBTITLES="subs"\nplaylist.m3u8\n'

        master_path = self.temp_dir / 'master.m3u8'
        with open(master_path, 'w', encoding='utf-8') as f:
            f.write(manifest)

        print(f"   ✅ Generated master.m3u8 with {len(m3u8_files)} subtitle tracks")
        return manifest

    def upload_master_manifest(self):
        """Upload master manifest to GCS."""
        print("\n📤 Uploading master manifest...")

        master_path = self.temp_dir / 'master.m3u8'
        gcs_uri = f'gs://{self.gcs_bucket}/{self.gcs_path}master.m3u8'

        subprocess.run([
            'gsutil', '-h', 'Cache-Control:no-cache, no-store, must-revalidate',
            '-h', 'Content-Type:application/vnd.apple.mpegurl',
            'cp', str(master_path), gcs_uri
        ], check=True, capture_output=True)

        print(f"   ✅ Master manifest uploaded")

    async def update_database(self):
        """Update MongoDB content with new stream URL."""
        print("\n💾 Updating database...")

        client = AsyncIOMotorClient(str(settings.MONGODB_URI))
        db = client[settings.MONGODB_DB_NAME]

        timestamp = int(datetime.now().timestamp())
        new_url = f'https://storage.googleapis.com/{self.gcs_bucket}/{self.gcs_path}master.m3u8?v={timestamp}'

        await db.content.update_one(
            {'_id': ObjectId(self.content_id)},
            {'$set': {'stream_url': new_url}}
        )

        print(f"   ✅ Updated stream_url")
        print(f"   Cache-buster: v={timestamp}")

        client.close()

    async def run(self):
        """Execute the complete HLS subtitle generation pipeline."""
        try:
            print("=" * 70)
            print("HLS SUBTITLE GENERATOR FOR APPLE TV/AIRPLAY")
            print("=" * 70)
            print(f"\nContent ID: {self.content_id}")
            print(f"GCS Bucket: {self.gcs_bucket}")
            print(f"GCS Path: {self.gcs_path}")
            print(f"AI Tracks: {'ENABLED' if self.generate_ai else 'DISABLED'}")

            await self.fetch_subtitles_from_db()
            await self.generate_standard_tracks()
            await self.generate_ai_tracks()
            self.generate_merged_tracks()
            self.generate_subtitle_playlists()
            self.upload_to_gcs()
            self.generate_master_manifest()
            self.upload_master_manifest()
            await self.update_database()

            print("\n" + "=" * 70)
            print("✅ HLS SUBTITLE GENERATION COMPLETE!")
            print("=" * 70)

            print("\n📊 Summary:")
            vtt_count = len(list(self.temp_dir.glob('subtitles_*.vtt')))
            m3u8_count = len(list(self.temp_dir.glob('subtitles_*.m3u8')))
            print(f"   - {vtt_count} VTT subtitle files")
            print(f"   - {m3u8_count} HLS playlists (.m3u8)")
            print(f"   - 1 master manifest")
            print(f"\n✅ Ready for Apple TV/AirPlay casting!")

        except Exception as e:
            print(f"\n❌ Error: {e}")
            raise
        finally:
            # Cleanup
            import shutil
            if self.temp_dir.exists():
                shutil.rmtree(self.temp_dir)


async def main():
    parser = argparse.ArgumentParser(
        description='Generate HLS subtitles with AI enhancements for Apple TV casting',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    parser.add_argument('content_id', help='MongoDB content ID')
    parser.add_argument('--ai', action='store_true', help='Generate AI-enhanced tracks')
    parser.add_argument('--gcs-bucket', default='bayit-plus-media-new', help='GCS bucket name')
    parser.add_argument('--gcs-path', help='GCS path (e.g., movies/Title/hls/)')

    args = parser.parse_args()

    # Auto-generate GCS path if not provided
    if not args.gcs_path:
        args.gcs_path = f'content/{args.content_id}/hls/'

    generator = HLSSubtitleGenerator(
        content_id=args.content_id,
        gcs_bucket=args.gcs_bucket,
        gcs_path=args.gcs_path,
        generate_ai=args.ai
    )

    await generator.run()


if __name__ == '__main__':
    asyncio.run(main())
