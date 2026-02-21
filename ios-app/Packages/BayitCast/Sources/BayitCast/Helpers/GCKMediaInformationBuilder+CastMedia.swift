#if os(iOS)
    import Foundation
    import GoogleCast

    extension GCKMediaInformationBuilder {
        /// Builds a `GCKMediaInformation` from a `CastMedia` value, including
        /// metadata, subtitle tracks, and HLS stream type detection.
        static func build(from media: CastMedia) -> GCKMediaInformation {
            let builder = GCKMediaInformationBuilder()
            builder.contentURL = media.streamUrl
            builder.contentType = contentType(for: media.streamUrl)
            builder.streamType = media.duration == nil ? .live : .buffered
            builder.streamDuration = media.duration ?? kGCKInvalidTimeInterval
            builder.metadata = metadata(from: media)
            builder.mediaTracks = buildTextTracks(from: media.subtitleTracks)
            return builder.build()
        }

        // MARK: - Private helpers

        private static func contentType(for url: URL) -> String {
            switch url.pathExtension.lowercased() {
            case "mpd": return "application/dash+xml"
            case "mp4": return "video/mp4"
            default: return "application/x-mpegURL" // HLS
            }
        }

        private static func metadata(from media: CastMedia) -> GCKMediaMetadata {
            let meta = GCKMediaMetadata(metadataType: .movie)
            meta.setString(media.title, forKey: kGCKMetadataKeyTitle)
            if let posterUrl = media.posterUrl {
                meta.addImage(GCKImage(url: posterUrl, width: 480, height: 270))
            }
            return meta
        }

        private static func buildTextTracks(from tracks: [SubtitleTrack]) -> [GCKMediaTrack] {
            tracks.enumerated().compactMap { index, track in
                GCKMediaTrack(
                    identifier: index,
                    contentIdentifier: track.url.absoluteString,
                    contentType: "text/vtt",
                    type: .text,
                    textSubtype: .subtitles,
                    name: track.name,
                    languageCode: track.language,
                    customData: nil
                )
            }
        }
    }
#endif
