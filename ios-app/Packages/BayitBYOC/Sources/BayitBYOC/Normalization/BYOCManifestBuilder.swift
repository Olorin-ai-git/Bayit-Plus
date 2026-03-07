import Foundation

/// Builds a BYOCManifest from local source data for backend normalization.
public enum BYOCManifestBuilder {
    /// Build a manifest from IPTV/Xtream channels and VOD items.
    public static func build(
        channels: [BYOCChannel],
        vodItems: [BYOCContentItem],
        seriesItems: [BYOCContentItem],
        sourceType: String,
        healthSample: HealthSampleResult? = nil
    ) -> BYOCManifest {
        var entries: [BYOCManifestEntry] = []

        for channel in channels {
            let resTag = extractResolutionTag(from: channel.name)
            entries.append(BYOCManifestEntry(
                name: channel.name,
                group: channel.group,
                logoUrl: channel.logoURL?.absoluteString,
                epgId: channel.attributes["epg_channel_id"],
                contentType: "live_channel",
                year: nil,
                durationSeconds: nil,
                languageHint: nil,
                resolutionTag: resTag,
                sourceType: sourceType
            ))
        }

        for item in vodItems {
            entries.append(BYOCManifestEntry(
                name: item.title,
                group: item.genre,
                logoUrl: item.thumbnailURL?.absoluteString,
                epgId: nil,
                contentType: item.contentType.rawValue,
                year: item.year,
                durationSeconds: item.duration,
                languageHint: nil,
                resolutionTag: nil,
                sourceType: sourceType
            ))
        }

        for item in seriesItems {
            entries.append(BYOCManifestEntry(
                name: item.title,
                group: item.genre,
                logoUrl: item.thumbnailURL?.absoluteString,
                epgId: nil,
                contentType: "series",
                year: item.year,
                durationSeconds: nil,
                languageHint: nil,
                resolutionTag: nil,
                sourceType: sourceType
            ))
        }

        return BYOCManifest(
            entries: entries,
            healthSample: healthSample,
            sourceType: sourceType
        )
    }

    /// Extract resolution tag from channel name (e.g., "HD", "FHD", "4K").
    static func extractResolutionTag(from name: String) -> String? {
        let upper = name.uppercased()
        let tags = ["4K", "UHD", "FHD", "1080P", "HD", "720P", "SD", "480P"]
        for tag in tags {
            if upper.contains(tag) { return tag }
        }
        return nil
    }
}
