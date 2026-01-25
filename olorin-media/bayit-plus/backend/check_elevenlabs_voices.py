import os
from elevenlabs import ElevenLabs

# Initialize ElevenLabs client
client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

# Get all available voices
voices = client.voices.get_all()

print("Available ElevenLabs Voices with Hebrew Support:\n")
print("=" * 80)

for voice in voices.voices:
    # Check if voice supports Hebrew
    if hasattr(voice, 'labels') and voice.labels:
        languages = voice.labels.get('language', '')
        if 'hebrew' in languages.lower() or 'he' in languages.lower() or 'multilingual' in languages.lower():
            print(f"\nName: {voice.name}")
            print(f"Voice ID: {voice.voice_id}")
            print(f"Labels: {voice.labels}")
            if hasattr(voice, 'description'):
                print(f"Description: {voice.description}")

print("\n" + "=" * 80)
