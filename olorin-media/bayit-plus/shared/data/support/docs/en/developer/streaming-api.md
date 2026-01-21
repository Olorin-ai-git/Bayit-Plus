# Streaming API

The Streaming API provides endpoints for initiating playback sessions, obtaining stream URLs, and managing adaptive streaming quality. All streams use HLS (HTTP Live Streaming) with optional DRM protection.

## Starting a Playback Session

Initialize a streaming session:

```
POST /v1/playback/sessions
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "content_id": "cnt_abc123",
  "profile_id": "prf_xyz789",
  "device_type": "web",
  "drm_type": "widevine"
}
```

**Response**:

```json
{
  "data": {
    "session_id": "ses_abc123",
    "manifest_url": "https://stream.bayit.plus/.../manifest.m3u8",
    "license_url": "https://drm.bayit.plus/license",
    "expires_at": "2024-01-15T12:00:00Z",
    "resume_position": 1234
  }
}
```

## Stream Manifest

The manifest URL returns an HLS playlist with multiple quality levels:

| Quality | Resolution | Bitrate |
|---------|------------|---------|
| Auto | Adaptive | Variable |
| SD | 720x480 | 1.5 Mbps |
| HD | 1280x720 | 3 Mbps |
| FHD | 1920x1080 | 6 Mbps |
| 4K | 3840x2160 | 15 Mbps |

## DRM Configuration

Bayit+ supports multiple DRM systems:

| DRM System | Platforms |
|------------|-----------|
| Widevine | Android, Chrome, Firefox |
| FairPlay | iOS, Safari, tvOS |
| PlayReady | Windows, Xbox, Edge |

Request the appropriate DRM type based on the playback device.

## Quality Selection

Force a specific quality level:

```
POST /v1/playback/sessions/{session_id}/quality
Content-Type: application/json

{
  "quality": "fhd"
}
```

## Heartbeat

Maintain an active session with periodic heartbeats:

```
POST /v1/playback/sessions/{session_id}/heartbeat
Content-Type: application/json

{
  "position_seconds": 2345,
  "buffer_health": 15.5,
  "quality": "hd"
}
```

Send heartbeats every 30 seconds during playback.

## Ending a Session

Properly close a playback session:

```
DELETE /v1/playback/sessions/{session_id}
Content-Type: application/json

{
  "final_position": 3456,
  "completed": false
}
```

This records the final position for resume functionality.

## Concurrent Stream Limits

Accounts have concurrent stream limits based on subscription tier. Exceeding the limit returns a `429` status with available sessions in the response for potential termination.

## Audio and Subtitle Tracks

Available tracks are listed in the manifest. Select tracks client-side using standard HLS track selection.
