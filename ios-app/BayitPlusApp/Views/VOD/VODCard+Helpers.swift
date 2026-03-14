import Foundation

/// Helper computed properties extracted from VODCard for file size management.
extension VODCard {
    var subtitle: String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    var aiLanguages: Set<String> {
        var langs = Set<String>()
        if item.availableSubtitleLanguages?.contains("he") == true {
            langs.insert("he")
        }
        if item.availableSubtitleLanguages?.contains("en") == true {
            langs.insert("en")
        }
        return langs
    }
}
