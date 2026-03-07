import Foundation

/// Converts YouTube videos into BYOCContentItem for unified display.
public enum YouTubeContentAdapter {
    /// Convert a YouTube video to a BYOC content item.
    public static func adapt(
        video: YouTubeVideo,
        sourceId: String
    ) -> BYOCContentItem {
        BYOCContentItem(
            id: "yt-\(sourceId)-\(video.id)",
            title: video.title,
            description: video.description,
            thumbnailURL: video.thumbnailURL,
            duration: video.duration,
            genre: video.channelTitle,
            sourceType: .youtube,
            sourceId: sourceId,
            streamURL: video.youtubeWebURL,
            contentType: video.isLive ? .liveChannel : .video
        )
    }

    /// Convert an array of YouTube videos.
    public static func adaptAll(
        videos: [YouTubeVideo],
        sourceId: String
    ) -> [BYOCContentItem] {
        videos.map { adapt(video: $0, sourceId: sourceId) }
    }
}
