import BayitCore
import Foundation
import Observation

/// Persisted onboarding preferences that drive content personalization.
/// Stored per-profile in UserDefaults and injected via @Environment.
@MainActor
@Observable
final class TVOnboardingPreferences {
    private(set) var profileId: String
    private let logger = BayitLogger(category: "TVOnboardingPrefs")

    var userName: String {
        get { string(for: .userName) ?? "" }
        set { set(newValue, for: .userName) }
    }

    var culture: String {
        get { string(for: .culture) ?? "israeli" }
        set { set(newValue, for: .culture) }
    }

    var interests: Set<String> {
        get { Set(array(for: .interests)) }
        set { set(Array(newValue), for: .interests) }
    }

    var contentLanguages: [String] {
        get { array(for: .contentLanguages) }
        set { set(newValue, for: .contentLanguages) }
    }

    var primaryLanguage: String {
        get { string(for: .primaryLanguage) ?? "en" }
        set { set(newValue, for: .primaryLanguage) }
    }

    var byocBannerDismissed: Bool {
        get { UserDefaults.standard.bool(forKey: key(for: .byocBannerDismissed)) }
        set { UserDefaults.standard.set(newValue, forKey: key(for: .byocBannerDismissed)) }
    }

    var homepageStyle: String {
        get { string(for: .homepageStyle) ?? "classic" }
        set { set(newValue, for: .homepageStyle) }
    }

    var isCinematicHome: Bool {
        homepageStyle == "cinematic"
    }

    var isOnboarded: Bool {
        UserDefaults.standard.bool(forKey: key(for: .completed))
    }

    init(profileId: String) {
        self.profileId = profileId
    }

    /// Reload preferences for a different profile.
    func switchProfile(_ newProfileId: String) {
        profileId = newProfileId
    }

    // MARK: - Interest Queries

    func isInterested(in interest: String) -> Bool {
        guard !interests.isEmpty else { return true }
        return interests.contains(interest)
    }

    /// Maps TVContentInterest rawValues to home section visibility.
    var showMovies: Bool {
        isInterested(in: "movies")
    }

    var showSeries: Bool {
        isInterested(in: "series")
    }

    var showLiveTV: Bool {
        isInterested(in: "liveTV")
    }

    var showPodcasts: Bool {
        isInterested(in: "podcasts")
    }

    var showAudiobooks: Bool {
        isInterested(in: "audiobooks")
    }

    var showRadio: Bool {
        isInterested(in: "radio")
    }

    var showKids: Bool {
        isInterested(in: "kidsContent")
    }

    var showMusic: Bool {
        isInterested(in: "music")
    }

    var showNews: Bool {
        isInterested(in: "news")
    }

    var showSports: Bool {
        isInterested(in: "sports")
    }

    /// Culture ID mapped for the content API.
    var cultureId: String? {
        switch culture {
        case "israeli": return "israeli"
        case "american": return "american"
        case "european": return "european"
        case "mixed": return nil
        default: return nil
        }
    }

    /// Preferred subtitle language (first content language that isn't primary).
    var preferredSubtitleLanguage: String? {
        contentLanguages.first { $0 != primaryLanguage }
    }

    // MARK: - Persistence Keys

    private enum PrefKey: String {
        case completed, userName, culture, interests
        case contentLanguages, primaryLanguage, byocBannerDismissed
        case homepageStyle
    }

    private func key(for pref: PrefKey) -> String {
        "tv.bayit.plus.onboarding.\(profileId).\(pref.rawValue)"
    }

    private func string(for pref: PrefKey) -> String? {
        UserDefaults.standard.string(forKey: key(for: pref))
    }

    private func array(for pref: PrefKey) -> [String] {
        UserDefaults.standard.stringArray(forKey: key(for: pref)) ?? []
    }

    private func set(_ value: String, for pref: PrefKey) {
        UserDefaults.standard.set(value, forKey: key(for: pref))
    }

    private func set(_ value: [String], for pref: PrefKey) {
        UserDefaults.standard.set(value, forKey: key(for: pref))
    }
}
