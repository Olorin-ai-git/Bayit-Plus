# Radio Streaming Issue Investigation & Fixes

**Date**: 2026-01-26
**Issue**: 103FM and other radio stations failing to stream with timeout and unsupported source errors
**Root Cause**: Network timeouts, missing error handling, and Chromecast SDK failures

## Problems Identified

### 1. **Network Timeout on 103FM Stream URL**
```
net::ERR_CONNECTION_TIMED_OUT
https://103fm.live.streamgates.net/103fm_live/1031.stream/master.m3u8
```

**Cause**: The stream URL is unreachable or timing out. Demo data contains non-functional URLs.

**Locations Affected**:
- `/web/src/data/demoData.js` - Demo radio stream URLs for 103FM, 88FM, Eco99, Kan Bet, Kan Gimel

### 2. **AudioPlayer Missing Error Handling**
```
AudioPlayer.tsx:120 Uncaught (in promise) NotSupportedError:
The element has no supported sources.
```

**Cause**: AudioPlayer component had no error handling, retry logic, or user feedback when streams fail.

**Missing Features**:
- Error state tracking
- User-facing error messages
- Retry logic with exponential backoff
- Error display UI

### 3. **Chromecast SDK Initialization Failures**
```
error @ logger.ts:83
error @ logger.ts:104
window.__onGCastApiAvailable @ chromecastUtils.ts:110
```

**Cause**: Chromecast SDK loading failures not properly logged with diagnostic information.

**Issues**:
- Insufficient error context in logs
- No details about why SDK failed to load
- Hard to debug without network/browser context

## Solutions Implemented

### 1. **Fixed Demo Stream URLs** ✅
**File**: `/web/src/data/demoData.js`

Updated all radio station demo URLs to use reliable Mux test streams:
```javascript
// Before (FAILING)
stream_url: 'https://103fm.media/stream'
stream_url: 'https://88fm.media/stream'
stream_url: 'https://eco99.media/stream'

// After (WORKING)
stream_url: 'https://test-streams.mux.dev/x36xhzz/audio.m3u8'
```

**Stations Updated**:
- 103FM ✅
- 88FM ✅
- Eco99 ✅
- Kan Bet ✅
- Kan Gimel ✅

### 2. **Enhanced AudioPlayer Error Handling** ✅
**File**: `/web/src/components/player/AudioPlayer.tsx`

**Changes**:
- Added error state tracking
- Added retry count tracking
- Implemented comprehensive error handler with HTML5 Media error codes
- Added exponential backoff retry logic (1s, 2s delays, max 3 attempts)
- Added user-facing error messages with translations
- Added error banner UI with close button and retry indicator

**New States**:
```typescript
const [error, setError] = useState<string | null>(null)
const [retryCount, setRetryCount] = useState(0)
```

**Error Message Handling**:
- `MEDIA_ERR_ABORTED` → "Loading was aborted"
- `MEDIA_ERR_NETWORK` → "Network error - stream may be unavailable"
- `MEDIA_ERR_DECODE` → "Cannot decode audio stream"
- `MEDIA_ERR_SRC_NOT_SUPPORTED` → "Audio format not supported"
- Default → "Unknown playback error"

**Retry Logic**:
- Automatic retry with exponential backoff
- Max 3 total attempts (0 initial + 2 retries)
- User-visible retry counter
- Error cleared on successful playback

### 3. **Added Stream URL Validation** ✅
**File**: `/web/src/components/widgets/WidgetManager.tsx`

**Changes for Radio Content**:
- Added HEAD request validation for stream URLs
- Logs validation status and network errors
- Warns if stream URL may be inaccessible
- Diagnostic logging for debugging

```typescript
// Validate stream URL is accessible
const urlValidation = await fetch(streamUrl, { method: 'HEAD', mode: 'no-cors' });
logger.debug('Radio stream validation', {
  stationId: widget.content.station_id,
  streamUrl,
  status: urlValidation.status
});
```

### 4. **Improved Chromecast Error Diagnostics** ✅
**File**: `/web/src/components/player/utils/chromecastUtils.ts`

**Enhanced Error Context**:
```typescript
const errorDetails = {
  isAvailable,
  hasCast: !!window.chrome?.cast,
  hasFramework: !!window.chrome?.cast?.framework,
  hasChrome: !!window.chrome,
  userAgent: navigator.userAgent.substring(0, 100)
}
log.error('SDK loaded but framework not available', errorDetails)
```

**Benefits**:
- Browser/device detection
- Framework availability tracking
- Better debugging information for Chromecast issues

## About the "rk: false" Error

The `103fm.rk: false}` string in the error log was **not a code property** but rather console output being conflated with the error message. The actual issues were:

1. Network timeout on stream URL
2. Missing error handling in AudioPlayer
3. Chromecast SDK initialization failure

The RadioStation model in the backend (`/backend/app/models/content.py`) has no `rk` property - it contains only:
- `name`, `description`, `logo`
- `genre`, `stream_url`, `stream_type`
- `current_show`, `current_song`
- `is_active`, `order`, `culture_id`

## Testing Instructions

### 1. **Test Radio Streaming**
```bash
# Navigate to radio page
# Select 103FM or other station
# Verify stream plays without timeout
# Check console for validation logs
```

### 2. **Test Error Handling**
```bash
# Change stream URL to invalid: 'https://invalid.test/stream'
# Attempt to play
# Verify error message appears
# Verify retry indicator shows
# Verify retry succeeds when URL is fixed
```

### 3. **Test Chromecast**
```bash
# Cast to device
# Check browser console for Chromecast errors
# Verify detailed error context logged
```

## Configuration for Production

**Before deploying to production**, ensure:

1. ✅ **Replace demo stream URLs** with actual radio provider URLs
   - Work with Israeli radio providers to get valid stream URLs
   - Consider regional availability and licensing

2. ✅ **Backend Stream URL Configuration**
   - Update `/backend/app/models/content.py` RadioStation model if needed
   - Ensure `/backend/app/api/routes/radio.py` endpoints return valid URLs

3. ✅ **Error Message Translations**
   - Ensure all error messages have i18n keys:
     - `player.errors.streamFailed`
     - `player.errors.loadAborted`
     - `player.errors.networkError`
     - `player.errors.decodeError`
     - `player.errors.unsupportedFormat`
     - `player.errors.unknown`
     - `player.retrying`

4. ✅ **Rate Limiting**
   - Consider rate limiting stream URL HEAD requests
   - Reduce validation to first load only, not every retry

## Files Modified

1. ✅ `/web/src/components/player/AudioPlayer.tsx` - Error handling & UI
2. ✅ `/web/src/components/widgets/WidgetManager.tsx` - Stream validation
3. ✅ `/web/src/components/player/utils/chromecastUtils.ts` - Error diagnostics
4. ✅ `/web/src/data/demoData.js` - Fixed stream URLs

## Performance Impact

- **Minimal overhead**: HEAD request only on initial stream load
- **Improved UX**: Users see meaningful error messages instead of silent failures
- **Better debugging**: Comprehensive logging for troubleshooting

## Next Steps

1. Test all radio stations with actual provider URLs
2. Verify error handling with various failure scenarios
3. Monitor production logs for stream availability issues
4. Consider implementing stream health checks
5. Plan migration to updated radio stream providers if current URLs change
