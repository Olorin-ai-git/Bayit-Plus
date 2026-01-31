# File Size Exception: service.py (230 lines)

**File:** `service.py`
**Size:** 230 lines
**Target:** < 200 lines
**Status:** ⚠️ Exception (single cohesive orchestration method)

## Why This Exception?

The file contains the `translate_episode()` method that orchestrates the complete 8-stage podcast translation pipeline. This method:

1. **Already significantly reduced** - From original 503 lines to 230 lines (54% reduction) by extracting all actual work to pipeline modules
2. **Is a sequential workflow** - Each stage depends on previous stage outputs (original_path → vocals/background → transcript → translation → TTS → mixed → uploaded)
3. **Maintains clear structure** - Linear progression through 8 well-defined stages with stage resumption logic
4. **Benefits from cohesion** - Splitting would create artificial boundaries and harm readability

## What Was Extracted

All heavy logic already moved to pipeline modules:
- `download.py` - Audio download (69 lines)
- `audio_processing.py` - Vocals separation, mixing, trimming (96 lines)
- `transcription.py` - Whisper transcription (32 lines)
- `commercial_removal.py` - AI commercial detection (103 lines)
- `translation.py` - Text translation with chunking (96 lines)
- `tts.py` - TTS generation (180 lines)
- `upload.py` - GCS upload (33 lines)

## What Remains in service.py

**Main orchestration logic (translate_episode method):**
- Atomic status updates
- Stage resumption checking (reuse vs new)
- Stage manager coordination
- Webhook notifications
- Error handling and rollback
- Database updates

**Helper methods:**
- `_run_separation()` - Wraps vocals separation with stage management
- `_run_transcription()` - Wraps transcription with stage management
- `_run_commercial_removal()` - Wraps commercial removal with stage management
- `_run_translation()` - Wraps translation with stage management

## Alternatives Considered

1. **Split into sub-methods** - Would create tight coupling between methods with many parameters
2. **Extract stage runners** - Already done (helper methods exist)
3. **State machine pattern** - Overcomplicated for this linear pipeline
4. **Move to pipeline module** - Orchestration logic belongs in service layer, not pipeline

## Conclusion

Accepting this as a **justified exception** to the 200-line rule. The file has been reduced by 54% and all actual work is in separate modules. Further splitting would harm maintainability.

---

*Created: 2026-01-31*
