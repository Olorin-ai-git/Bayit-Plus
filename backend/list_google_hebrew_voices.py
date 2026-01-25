"""
List Google Cloud Text-to-Speech Hebrew voices
"""
from google.cloud import texttospeech

def list_hebrew_voices():
    """List all Hebrew voices available in Google Cloud TTS"""

    client = texttospeech.TextToSpeechClient()

    # Request list of voices
    response = client.list_voices(language_code="he-IL")

    print("=" * 80)
    print("GOOGLE CLOUD TTS - HEBREW VOICES")
    print("=" * 80)
    print()

    print(f"Found {len(response.voices)} Hebrew voices:")
    print()

    for voice in response.voices:
        print(f"Name: {voice.name}")
        print(f"  Gender: {voice.ssml_gender.name}")
        print(f"  Languages: {', '.join(voice.language_codes)}")
        print(f"  Natural sample rate: {voice.natural_sample_rate_hertz} Hz")
        print()

    print("=" * 80)
    print("RECOMMENDATION FOR MALE VOICE:")
    print("=" * 80)
    print()

    # Find male voices
    male_voices = [v for v in response.voices if v.ssml_gender.name == "MALE"]

    if male_voices:
        print(f"Found {len(male_voices)} male Hebrew voice(s):")
        for voice in male_voices:
            print(f"  - {voice.name}")
        print()
        print(f"✅ Recommended: {male_voices[0].name}")
    else:
        print("❌ No male Hebrew voices found")

    print()
    print("=" * 80)

if __name__ == "__main__":
    list_hebrew_voices()
