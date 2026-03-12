import Foundation

/// Session-scoped cache tracking which VOD AI features have been unlocked
/// for specific content, avoiding redundant API calls and double-charging.
actor VODAIUsageCache {
    private var unlocked: Set<String> = []

    func isUnlocked(contentId: String, featureId: String) -> Bool {
        unlocked.contains(cacheKey(contentId: contentId, featureId: featureId))
    }

    func markUnlocked(contentId: String, featureId: String) {
        unlocked.insert(cacheKey(contentId: contentId, featureId: featureId))
    }

    func clear() {
        unlocked.removeAll()
    }

    private func cacheKey(contentId: String, featureId: String) -> String {
        "\(contentId)_\(featureId)"
    }
}
