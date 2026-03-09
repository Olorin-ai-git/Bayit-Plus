import Foundation

/// Manages contextual tooltip display state per user.
/// Tracks which tooltips have been shown and persists to UserDefaults.
@Observable
final class TooltipManager {
    private let userDefaultsKeyPrefix = "bayit.onboarding.tooltips"
    private var userId: String
    private(set) var shownTooltips: Set<String> = []
    var tipsDisabled: Bool {
        didSet { persistState() }
    }

    init(userId: String) {
        self.userId = userId
        tipsDisabled = false
        loadState()
    }

    /// Whether a tooltip should be shown for the given feature.
    func shouldShow(_ featureKey: String) -> Bool {
        guard !tipsDisabled else { return false }
        return !shownTooltips.contains(featureKey)
    }

    /// Mark a tooltip as shown (will not appear again).
    func markShown(_ featureKey: String) {
        shownTooltips.insert(featureKey)
        persistState()
    }

    /// Reset all tooltip states (for replay from settings).
    func resetAll() {
        shownTooltips.removeAll()
        tipsDisabled = false
        persistState()
    }

    /// Update the user ID (e.g., after login).
    func updateUserId(_ newId: String) {
        userId = newId
        loadState()
    }

    // MARK: - Persistence

    private var storageKey: String {
        "\(userDefaultsKeyPrefix).\(userId)"
    }

    private var disabledKey: String {
        "\(userDefaultsKeyPrefix).disabled.\(userId)"
    }

    private func loadState() {
        let defaults = UserDefaults.standard
        if let stored = defaults.stringArray(forKey: storageKey) {
            shownTooltips = Set(stored)
        } else {
            shownTooltips = []
        }
        tipsDisabled = defaults.bool(forKey: disabledKey)
    }

    private func persistState() {
        let defaults = UserDefaults.standard
        defaults.set(Array(shownTooltips), forKey: storageKey)
        defaults.set(tipsDisabled, forKey: disabledKey)
    }
}
