"""Text translation with chunking for large transcripts."""
import logging
import re

from app.services.olorin.dubbing.translation import TranslationProvider

logger = logging.getLogger(__name__)


async def translate_text(
    transcript: str,
    source_lang_code: str,
    target_lang_code: str,
) -> str:
    """
    Translate transcript with automatic chunking for large texts.

    Args:
        transcript: Text to translate
        source_lang_code: Source language ISO code
        target_lang_code: Target language ISO code

    Returns:
        Translated text

    Raises:
        ValueError: If translation fails
    """
    # Create translation provider for target language
    translation_provider = TranslationProvider(target_language=target_lang_code)
    await translation_provider.initialize()

    # CRITICAL: Chunk large transcripts to avoid Google Translate API 200KB limit
    # Note: API limit is for ENTIRE request payload (text + JSON + metadata), not just text
    # Use very conservative limit to account for ~150KB of API request overhead
    MAX_CHUNK_BYTES = 50000  # 50KB per chunk to be very safe
    transcript_bytes = transcript.encode("utf-8")

    logger.info(f"🔍 Transcript size: {len(transcript_bytes):,} bytes")
    logger.info(f"🔍 MAX_CHUNK_BYTES: {MAX_CHUNK_BYTES:,} bytes")
    logger.info(f"🔍 Will chunk: {len(transcript_bytes) > MAX_CHUNK_BYTES}")

    if len(transcript_bytes) > MAX_CHUNK_BYTES:
        logger.info(
            f"⚠️  Transcript too large ({len(transcript_bytes):,} bytes). "
            f"Chunking for translation..."
        )

        # Split transcript into chunks at sentence boundaries
        sentences = re.split(r"[.!?…]+\s+|[׃׀]+\s+", transcript)
        sentences = [s.strip() for s in sentences if s.strip()]

        chunks = []
        current_chunk = []
        current_bytes = 0

        for sentence in sentences:
            sentence_bytes = len(sentence.encode("utf-8"))

            # If adding this sentence would exceed limit, start new chunk
            if current_bytes + sentence_bytes + 1 > MAX_CHUNK_BYTES:
                if current_chunk:
                    chunks.append(" ".join(current_chunk))
                current_chunk = [sentence]
                current_bytes = sentence_bytes
            else:
                current_chunk.append(sentence)
                current_bytes += sentence_bytes + 1

        if current_chunk:
            chunks.append(" ".join(current_chunk))

        logger.info(f"Split into {len(chunks)} chunks")

        # Translate each chunk
        translated_chunks = []
        for i, chunk in enumerate(chunks, 1):
            logger.info(
                f"Translating chunk {i}/{len(chunks)} "
                f"({len(chunk.encode('utf-8')):,} bytes)"
            )
            chunk_translation = await translation_provider.translate(
                text=chunk, source_lang=source_lang_code
            )
            translated_chunks.append(chunk_translation)

        translated_text = " ".join(translated_chunks)
        logger.info(f"✅ Combined {len(chunks)} translated chunks successfully")

    else:
        # Translate using Google Cloud Translate or Claude (small transcript)
        translated_text = await translation_provider.translate(
            text=transcript, source_lang=source_lang_code
        )

    return translated_text
