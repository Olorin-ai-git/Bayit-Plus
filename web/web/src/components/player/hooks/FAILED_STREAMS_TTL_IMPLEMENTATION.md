# Failed Streams TTL Implementation

## Overview

Implemented a Time-To-Live (TTL) mechanism for the failed streams blocklist in the HLS player. This prevents valid streams from being permanently blocked after temporary network issues.

## Changes Made

### 1. Data Structure Change

**Before:**
```typescript
const failedStreamUrls = new Set<string>()
```

**After:**
```typescript
const failedStreamUrls = new Map<string, number>()  // Map<streamUrl, timestamp>
```

### 2. TTL Configuration

- **TTL Duration**: 5 minutes (300,000ms)
- Failed streams are automatically removed from the blocklist after 5 minutes
- Allows retrying previously failed streams once the TTL expires

### 3. New Functions

#### `isStreamFailureExpired(timestamp: number): boolean`
Checks if a failed stream entry has expired based on TTL.

#### `cleanupExpiredStreams(): void`
Removes all expired entries from the failed streams map.

#### `isStreamBlocked(url: string): boolean`
Checks if a stream URL is blocked and not expired. Automatically removes expired entries.

#### `getFailedStreamsStats(): object`
Returns detailed statistics about failed streams including:
- Total count
- Expired count
- Active (non-expired) count
- List of all streams with expiration info

### 4. Automatic Cleanup

- **Periodic cleanup**: Runs every 60 seconds to remove expired entries
- **On-demand cleanup**: Runs when checking if a stream is blocked
- **Explicit cleanup**: Can be called via browser console

## Browser Console Commands

### Existing Commands

```javascript
// Clear all failed streams immediately
clearFailedStreams()

// Get list of all failed stream URLs
getFailedStreams()

// Kill all HLS instances and clear sessions
killStaleHLS()
```

### New Commands

```javascript
// Clean up expired streams manually
cleanupExpiredStreams()

// Get detailed statistics about failed streams
getFailedStreamsStats()
// Returns:
// {
//   total: 3,
//   expired: 1,
//   active: 2,
//   streams: [
//     {
//       url: 'https://...',
//       timestamp: 1706985234567,
//       expiresIn: 120000,  // milliseconds until expiry
//       isExpired: false
//     },
//     ...
//   ]
// }
```

## Example Usage

### Scenario 1: Ice Age Movie Issue

The Ice Age movie was showing "streaming unavailable" because its URL was in the failed streams blocklist.

**Before TTL (Manual Fix Required):**
```javascript
// User had to run:
clearFailedStreams()
```

**After TTL (Automatic Fix):**
- Stream automatically becomes available after 5 minutes
- No manual intervention needed
- User can still use `clearFailedStreams()` for immediate retry

### Scenario 2: Monitoring Failed Streams

```javascript
// Check which streams are blocked and when they'll expire
const stats = getFailedStreamsStats()

console.log(`Total failed streams: ${stats.total}`)
console.log(`Active (not expired): ${stats.active}`)
console.log(`Expired (ready for retry): ${stats.expired}`)

// See detailed info for each stream
stats.streams.forEach(stream => {
  const minutes = Math.ceil(stream.expiresIn / 60000)
  console.log(`${stream.url} - expires in ${minutes} minutes`)
})
```

### Scenario 3: Testing Stream Retry

```javascript
// 1. Try to play a movie that fails
// 2. Wait 5 minutes (or clear manually)
clearFailedStreams()  // Or wait for TTL
// 3. Try again - stream will be retried
```

## Benefits

### 1. **Automatic Recovery**
Failed streams become available again without manual intervention.

### 2. **Prevents Permanent Blocking**
Temporary network issues don't permanently block valid content.

### 3. **Reduced User Friction**
Users don't need to:
- Hard reload the page
- Clear browser cache
- Contact support

### 4. **Better Debugging**
New statistics API helps identify patterns in stream failures.

### 5. **Configurable TTL**
TTL can be adjusted by changing `FAILED_STREAM_TTL` constant:
```typescript
// Current: 5 minutes
const FAILED_STREAM_TTL = 5 * 60 * 1000

// Can be changed to:
const FAILED_STREAM_TTL = 10 * 60 * 1000  // 10 minutes
const FAILED_STREAM_TTL = 2 * 60 * 1000   // 2 minutes
```

## Technical Details

### When Streams Are Added to Blocklist

Streams are added with a timestamp when:
1. **Live streams**: After 3 consecutive network errors (404s)
2. **VOD streams**: On fatal HLS errors

### When Streams Are Removed

Streams are automatically removed when:
1. **TTL expires**: 5 minutes after being added
2. **Manual clear**: User calls `clearFailedStreams()`
3. **Page reload**: Map is in-memory, cleared on reload
4. **Periodic cleanup**: Every 60 seconds
5. **Lazy removal**: When checking if stream is blocked

### Performance Impact

- **Minimal**: Map operations are O(1)
- **Cleanup**: Runs every 60 seconds, only logs if entries removed
- **Memory**: Negligible - typically < 10 entries

## Testing

Verified with unit tests:
- ✅ Fresh streams are blocked
- ✅ Expired streams are not blocked
- ✅ Expired streams are removed from map
- ✅ Non-existent streams are not blocked
- ✅ TTL expiration calculation is correct

## Migration Notes

### Breaking Changes
None. The API remains the same:
- `clearFailedStreams()` still works
- `getFailedStreams()` still returns array of URLs
- Behavior is backward compatible

### New Features
- Automatic TTL-based expiration
- `getFailedStreamsStats()` for monitoring
- `cleanupExpiredStreams()` for manual cleanup

## Future Improvements

Potential enhancements:
1. **Configurable TTL per stream type** (live vs VOD)
2. **Exponential backoff** (increase TTL on repeated failures)
3. **Persistent storage** (localStorage) to survive page reloads
4. **UI indicator** showing blocked streams and time until retry
5. **Analytics** to track stream failure patterns

## Related Files

- `web/src/components/player/hooks/useHLSPlayer.ts` - Main implementation
- `web/src/components/player/hooks/useVideoPlayer.ts` - Player state management
- `web/src/components/player/VideoPlayer.tsx` - Player component

## Author

Implementation Date: February 3, 2026
Issue: Ice Age movie showing "streaming unavailable"
Solution: Added TTL-based automatic retry mechanism
