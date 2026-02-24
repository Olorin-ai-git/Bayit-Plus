import AVFoundation
import BayitCore

/// A chapter marker extracted from an m4b/m4a asset's embedded metadata.
public struct EmbeddedChapter: Sendable, Identifiable {
    public let id: String
    public let title: String
    public let chapterNumber: Int
    public let startTime: TimeInterval
    public let endTime: TimeInterval

    public var duration: TimeInterval {
        endTime - startTime
    }

    /// Formatted duration string (e.g. "12:34" or "1:02:34").
    public var formattedDuration: String {
        let totalSeconds = Int(duration)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let seconds = totalSeconds % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%d:%02d", minutes, seconds)
    }
}

/// Extracts chapter markers from AVAsset timed metadata (m4b/m4a files).
public enum ChapterMetadataParser {
    private static let logger = BayitLogger(category: "ChapterParser")

    /// Parse chapter metadata from an asset URL.
    ///
    /// M4B files store chapter markers as `AVTimedMetadataGroup` entries.
    /// Each group contains a time range and metadata items (title, artwork).
    /// Returns an empty array if the asset contains no chapter metadata.
    public static func parseChapters(from url: URL) async -> [EmbeddedChapter] {
        let asset = AVURLAsset(url: url)
        return await parseChapters(from: asset)
    }

    /// Parse chapter metadata from a loaded AVURLAsset.
    public static func parseChapters(from asset: AVURLAsset) async -> [EmbeddedChapter] {
        do {
            let languages = try await asset.load(.availableChapterLocales)
            let preferredLanguages = languages.map { $0.identifier }

            let groups: [AVTimedMetadataGroup]
            if preferredLanguages.isEmpty {
                // Try loading with empty language preference (common for m4b)
                groups = try await asset.loadChapterMetadataGroups(
                    bestMatchingPreferredLanguages: [""]
                )
            } else {
                groups = try await asset.loadChapterMetadataGroups(
                    bestMatchingPreferredLanguages: preferredLanguages
                )
            }

            guard !groups.isEmpty else {
                logger.info("No chapter metadata found in asset")
                return []
            }

            var chapters: [EmbeddedChapter] = []

            for (index, group) in groups.enumerated() {
                let timeRange = group.timeRange
                let startSeconds = timeRange.start.seconds
                let endSeconds = startSeconds + timeRange.duration.seconds

                guard startSeconds.isFinite, endSeconds.isFinite else { continue }

                let title = await extractTitle(from: group.items) ?? "Chapter \(index + 1)"

                chapters.append(EmbeddedChapter(
                    id: "embedded-\(index)",
                    title: title,
                    chapterNumber: index + 1,
                    startTime: startSeconds,
                    endTime: endSeconds
                ))
            }

            logger.info(
                "Parsed embedded chapters",
                context: ["count": String(chapters.count)]
            )
            return chapters

        } catch {
            logger.warning(
                "Failed to parse chapter metadata",
                context: ["error": error.localizedDescription]
            )
            return []
        }
    }

    private static func extractTitle(from items: [AVMetadataItem]) async -> String? {
        for item in items {
            if let commonKey = item.commonKey, commonKey == .commonKeyTitle {
                if let value = try? await item.load(.stringValue) {
                    return value
                }
            }
        }
        // Fallback: check all items for a string value
        for item in items {
            if let value = try? await item.load(.stringValue), !value.isEmpty {
                return value
            }
        }
        return nil
    }
}
