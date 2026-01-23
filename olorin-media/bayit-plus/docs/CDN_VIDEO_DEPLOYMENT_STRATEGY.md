# CDN Video Deployment Strategy for Widgets Intro Video

## Overview

The Widgets Intro Video (`widgets-intro.mp4`, 17.4 MB) and associated caption files (3 x VTT files) should be deployed to a CDN rather than bundled with mobile applications to:

- Reduce app bundle size significantly
- Enable video updates without app releases
- Improve download speeds via CDN edge locations
- Support multi-region delivery optimization

## File Assets

### Video File
- **File**: `widgets-intro.mp4`
- **Size**: 17.4 MB
- **Format**: H.264/AAC, 1920x1080, ~85 seconds
- **Current Location**: `web/public/media/widgets-intro.mp4`

### Caption Files (WCAG 2.1 AA Compliance)
- **English**: `widgets-intro-en.vtt`
- **Spanish**: `widgets-intro-es.vtt`
- **Hebrew**: `widgets-intro-he.vtt`
- **Current Location**: `web/public/media/`

## Deployment Options

### Option 1: Firebase Hosting + CDN (Recommended)

**Pros:**
- Already integrated with Firebase ecosystem
- Global CDN (Fastly) included automatically
- Simple deployment via `firebase deploy --only hosting`
- Built-in cache headers and compression
- No additional cost (within Firebase plan limits)

**Cons:**
- Tied to Firebase infrastructure
- Less control over CDN configuration

**Implementation:**

1. **firebase.json** already configured with cache headers:
```json
{
  "source": "**/*.@(mp4|webm|mov)",
  "headers": [
    { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
    { "key": "Content-Type", "value": "video/mp4" }
  ]
},
{
  "source": "**/*.vtt",
  "headers": [
    { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
    { "key": "Content-Type", "value": "text/vtt" }
  ]
}
```

2. **Deploy to Firebase Hosting:**
```bash
cd web
npm run build
firebase deploy --only hosting
```

3. **CDN URLs:**
- Production: `https://bayitplus.web.app/media/widgets-intro.mp4`
- Staging: `https://bayitplus-staging.web.app/media/widgets-intro.mp4`

4. **Environment Configuration:**
```bash
# Production .env
VITE_WIDGETS_INTRO_VIDEO_URL=https://bayitplus.web.app/media/widgets-intro.mp4

# Staging .env
VITE_WIDGETS_INTRO_VIDEO_URL=https://bayitplus-staging.web.app/media/widgets-intro.mp4

# Local Development
VITE_WIDGETS_INTRO_VIDEO_URL=/media/widgets-intro.mp4
```

### Option 2: Google Cloud Storage + Cloud CDN

**Pros:**
- Fine-grained control over caching, compression, CORS
- Can use signed URLs for access control
- Integrated with GCP services
- Better analytics and monitoring

**Cons:**
- Additional infrastructure to manage
- Separate deployment pipeline
- Additional cost (~$0.026/GB egress via CDN)

**Implementation:**

1. **Create GCS Bucket:**
```bash
gsutil mb -p bayit-plus -c STANDARD -l US gs://bayit-plus-media/
gsutil web set -m index.html -e 404.html gs://bayit-plus-media/
```

2. **Upload Video Assets:**
```bash
gsutil -m cp -r web/public/media/*.mp4 gs://bayit-plus-media/videos/
gsutil -m cp -r web/public/media/*.vtt gs://bayit-plus-media/videos/
```

3. **Set CORS and Cache Headers:**
```bash
# cors.json
[
  {
    "origin": ["https://bayitplus.web.app", "https://app.bayitplus.com"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]

gsutil cors set cors.json gs://bayit-plus-media/

# Cache headers
gsutil setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  gs://bayit-plus-media/videos/*.mp4

gsutil setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  gs://bayit-plus-media/videos/*.vtt
```

4. **Enable Cloud CDN:**
```bash
gcloud compute backend-buckets create bayit-plus-media-backend \
  --gcs-bucket-name=bayit-plus-media \
  --enable-cdn
```

5. **Environment Configuration:**
```bash
VITE_WIDGETS_INTRO_VIDEO_URL=https://storage.googleapis.com/bayit-plus-media/videos/widgets-intro.mp4
```

### Option 3: CloudFlare R2 + CDN

**Pros:**
- Zero egress fees (unlimited bandwidth)
- Excellent global CDN performance
- S3-compatible API
- Automatic image/video optimization

**Cons:**
- New infrastructure to set up
- Migration from existing Firebase setup
- Storage costs ($0.015/GB/month)

**Implementation:**

1. **Create R2 Bucket:**
```bash
# Via CloudFlare Dashboard or Wrangler CLI
wrangler r2 bucket create bayit-plus-media
```

2. **Upload Assets:**
```bash
wrangler r2 object put bayit-plus-media/videos/widgets-intro.mp4 \
  --file=web/public/media/widgets-intro.mp4 \
  --content-type=video/mp4

wrangler r2 object put bayit-plus-media/videos/widgets-intro-en.vtt \
  --file=web/public/media/widgets-intro-en.vtt \
  --content-type=text/vtt
```

3. **Configure Custom Domain:**
```bash
# In CloudFlare Dashboard:
# R2 → bayit-plus-media → Settings → Custom Domains
# Add: media.bayitplus.com
```

4. **Environment Configuration:**
```bash
VITE_WIDGETS_INTRO_VIDEO_URL=https://media.bayitplus.com/videos/widgets-intro.mp4
```

## Mobile App Configuration

### iOS (Info.plist)

Allow CDN domain for video loading:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <false/>
  <key>NSExceptionDomains</key>
  <dict>
    <key>bayitplus.web.app</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <false/>
      <key>NSIncludesSubdomains</key>
      <true/>
    </dict>
    <!-- If using custom CDN domain -->
    <key>media.bayitplus.com</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <false/>
      <key>NSIncludesSubdomains</key>
      <true/>
    </dict>
  </dict>
</dict>
```

### Android (AndroidManifest.xml)

```xml
<application
  android:usesCleartextTraffic="false"
  android:networkSecurityConfig="@xml/network_security_config">
</application>
```

**res/xml/network_security_config.xml:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">bayitplus.web.app</domain>
    <domain includeSubdomains="true">media.bayitplus.com</domain>
  </domain-config>
</network-security-config>
```

### tvOS

Same as iOS configuration. Ensure CDN URLs are in `Info.plist` exception domains.

## Performance Optimization

### Video Encoding Recommendations

For optimal CDN delivery:

```bash
ffmpeg -i widgets-intro.mp4 \
  -c:v libx264 -preset slow -crf 22 \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  -pix_fmt yuv420p \
  widgets-intro-optimized.mp4
```

**Key Optimizations:**
- **-movflags +faststart**: Moves MOOV atom to beginning for faster streaming
- **-crf 22**: Constant Rate Factor (18-23 = visually lossless)
- **-preset slow**: Better compression at cost of encoding time
- **yuv420p**: Maximum compatibility

### Caption File Optimization

VTT files are already minimal. Ensure:
- Unix line endings (LF, not CRLF)
- UTF-8 encoding without BOM
- Gzip compression enabled (automatic on Firebase/GCS)

### Cache Strategy

**Immutable Assets (Current Implementation):**
```
Cache-Control: public, max-age=31536000, immutable
```

This is ideal for versioned assets. If video needs updating:
1. Upload new file with new name: `widgets-intro-v2.mp4`
2. Update environment variable
3. Deploy app update

**Alternative: Short-lived Cache with Revalidation:**
```
Cache-Control: public, max-age=86400, must-revalidate
```

Use if you need to update video without changing URL.

## Monitoring and Analytics

### Firebase Hosting Analytics

Monitor video delivery via Firebase Console:
- **Hosting → Usage**: Bandwidth and request metrics
- **Performance**: CDN hit rates and response times
- **Errors**: 404s, 500s, timeouts

### Google Cloud CDN Metrics

If using GCS + Cloud CDN:

```bash
# View CDN cache hit ratio
gcloud monitoring time-series list \
  --filter='metric.type="loadbalancing.googleapis.com/https/backend_request_count"' \
  --format=json

# View bandwidth usage
gcloud monitoring time-series list \
  --filter='metric.type="compute.googleapis.com/network/sent_bytes_count"' \
  --format=json
```

### Custom Analytics

Track video views in application:

```typescript
// In WidgetsIntroVideo.tsx handleVideoLoaded
const trackVideoView = async () => {
  await fetch('/api/analytics/video-view', {
    method: 'POST',
    body: JSON.stringify({
      videoId: 'widgets-intro',
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    }),
  });
};
```

## Cost Estimation

### Firebase Hosting (Free Tier)
- **Storage**: 10 GB free → Video uses 0.017 GB (0.17% of quota)
- **Bandwidth**: 360 MB/day free
- **Estimate**: ~20 video views/day free (17.4 MB × 20 = 348 MB)
- **Overage**: $0.15/GB after quota

### Google Cloud Storage + CDN
- **Storage**: $0.020/GB/month → $0.00035/month
- **CDN Egress**: $0.08/GB (first 10 TB) → $1.39 per 1,000 views
- **Requests**: $0.0004 per 1,000 requests → negligible

### CloudFlare R2
- **Storage**: $0.015/GB/month → $0.00026/month
- **Egress**: FREE (unlimited)
- **Requests**: $0.36 per million reads → negligible

**Recommendation**: Firebase Hosting for simplicity, CloudFlare R2 for scale (>1,000 views/day).

## Deployment Checklist

### Pre-Deployment
- [ ] Video optimized with `-movflags +faststart`
- [ ] All 3 caption files (en, es, he) created and tested
- [ ] Environment variables configured for each environment
- [ ] CDN cache headers verified in firebase.json or GCS metadata

### Deployment
- [ ] Assets uploaded to CDN
- [ ] CDN URLs accessible via HTTPS
- [ ] CORS headers configured (if using GCS)
- [ ] Cache headers applied correctly

### Post-Deployment Verification
- [ ] Test video loads on web (desktop + mobile browsers)
- [ ] Test video loads in iOS app (Simulator + Device)
- [ ] Test video loads in Android app (Emulator + Device)
- [ ] Test video loads in tvOS app (Simulator + Device)
- [ ] Verify captions display correctly in all languages
- [ ] Verify CDN cache hits after first load
- [ ] Monitor bandwidth usage for 24 hours

### Rollback Plan
If CDN deployment fails:
1. Revert `VITE_WIDGETS_INTRO_VIDEO_URL` to local path `/media/widgets-intro.mp4`
2. Ensure fallback video exists in `web/public/media/`
3. Deploy app update with reverted config

## Future Enhancements

### Multi-Bitrate Streaming (HLS/DASH)
For better mobile experience, consider adaptive bitrate streaming:

```bash
# Generate HLS variants
ffmpeg -i widgets-intro.mp4 \
  -map 0:v -map 0:a -map 0:v -map 0:a \
  -c:v libx264 -c:a aac \
  -b:v:0 1000k -s:v:0 1280x720 \
  -b:v:1 500k -s:v:1 854x480 \
  -b:a 128k \
  -var_stream_map "v:0,a:0 v:1,a:1" \
  -master_pl_name master.m3u8 \
  -hls_time 10 -hls_list_size 0 \
  -f hls stream_%v.m3u8
```

### Video Thumbnails
Generate poster image for faster perceived loading:

```bash
ffmpeg -i widgets-intro.mp4 -ss 00:00:02 -vframes 1 \
  widgets-intro-poster.jpg
```

Update component:
```tsx
<video poster={`${videoUrl.replace('.mp4', '-poster.jpg')}`} ... />
```

### Progressive Enhancement
Detect network quality and serve appropriate resolution:

```typescript
const getVideoQuality = () => {
  if (navigator.connection) {
    const { effectiveType } = navigator.connection;
    if (effectiveType === '4g') return 'high'; // 1080p
    if (effectiveType === '3g') return 'medium'; // 720p
    return 'low'; // 480p
  }
  return 'high';
};
```

## Support and Troubleshooting

### Common Issues

**1. Video doesn't load on iOS**
- Verify CDN domain in `Info.plist` NSAppTransportSecurity
- Check certificate is valid (no self-signed certs)
- Ensure `-movflags +faststart` was applied

**2. Captions don't display**
- Verify VTT file syntax (no CRLF line endings)
- Check CORS headers allow caption requests
- Ensure VTT files served with `Content-Type: text/vtt`

**3. Slow video loading**
- Verify CDN cache headers applied
- Check CDN hit rate in analytics
- Consider multi-bitrate HLS/DASH for mobile

**4. High bandwidth costs**
- Implement usage analytics to identify abuse
- Add rate limiting on video endpoint
- Consider CloudFlare R2 (free egress)

### Contact

For CDN deployment issues:
- **DevOps Lead**: [contact info]
- **Firebase Console**: https://console.firebase.google.com/project/bayit-plus
- **GCP Console**: https://console.cloud.google.com/storage/browser?project=bayit-plus

---

**Last Updated**: 2026-01-23
**Author**: Olorin AI System
**Version**: 1.0
