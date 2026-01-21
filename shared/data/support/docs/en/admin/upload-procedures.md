# Video Upload Procedures

This guide covers the complete workflow for uploading video content to Bayit+, from file preparation through encoding and metadata completion.

## File Preparation

Before uploading, ensure your source files meet these requirements:

| Specification | Requirement |
|---------------|-------------|
| Format | MP4, MOV, MKV, or MXF |
| Video Codec | H.264, H.265, or ProRes |
| Resolution | Minimum 1920x1080 (4K preferred) |
| Audio | AAC or PCM, stereo or 5.1 |
| Bitrate | Minimum 15 Mbps for HD |

## Starting an Upload

1. Navigate to **Content** > **Upload**
2. Drag files into the upload zone or click to browse
3. Multiple files can be uploaded simultaneously
4. Large files support resumable uploads

## Upload Progress

Monitor upload status from the **Upload Queue**:

- **Uploading**: File transfer in progress
- **Processing**: Transcoding and packaging
- **Ready**: Available for metadata entry
- **Published**: Live on the platform

## Encoding Process

After upload, files are automatically transcoded:

- Multiple quality levels (SD, HD, 4K when applicable)
- HLS packaging for adaptive streaming
- Audio normalization and loudness compliance
- Thumbnail generation at key frames

Processing time varies based on duration and source quality.

## Metadata Entry

Complete required metadata for each upload:

1. **Basic Info**: Title, description, release year
2. **Classification**: Categories, genres, tags
3. **Ratings**: Age rating and content descriptors
4. **Credits**: Cast, crew, and production details
5. **Artwork**: Poster, backdrop, and logo images

## Artwork Requirements

| Asset Type | Dimensions | Format |
|------------|------------|--------|
| Poster | 800x1200 px | JPEG or PNG |
| Backdrop | 1920x1080 px | JPEG or PNG |
| Logo | 400x150 px | PNG with transparency |
| Thumbnail | 640x360 px | JPEG |

## Publishing Content

Once metadata is complete:

1. Click **Review** to preview the content page
2. Verify all information displays correctly
3. Choose publish timing (immediate or scheduled)
4. Click **Publish** to make content available

## Bulk Uploads

For large content libraries, use the bulk upload feature:

1. Prepare a CSV file with metadata
2. Upload video files via SFTP
3. Import the metadata CSV
4. Review and publish in batches
