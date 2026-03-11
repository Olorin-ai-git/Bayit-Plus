import BayitCore
import Foundation
import Observation

/// Feature flags read from Info.plist or environment variables.
/// All flags default to disabled and must be explicitly enabled via configuration.
@Observable
final class FeatureFlags {
    let isLiveDubbingEnabled: Bool
    let isTriviaEnabled: Bool
    let isLLMSearchEnabled: Bool
    let isShabbatModeEnabled: Bool
    let isFamilyControlsEnabled: Bool
    #if os(iOS)
        let isWakeWordEnabled: Bool
    #endif
    #if os(iOS)
        let isCarPlayEnabled: Bool
    #endif
    let isAvatarModeEnabled: Bool
    let isProactiveVoiceEnabled: Bool
    let isInteractiveSubtitlesEnabled: Bool
    let isChapterNavigationEnabled: Bool
    let isAudiobooksEnabled: Bool
    let isHouseholdEnabled: Bool
    let isDevicePairingEnabled: Bool
    let isRewardsEnabled: Bool
    let isLegacyFeaturesEnabled: Bool

    init() {
        let info = Bundle.main.infoDictionary ?? [:]
        let env = ProcessInfo.processInfo.environment

        isLiveDubbingEnabled = Self.flag("FEATURE_LIVE_DUBBING", info: info, env: env)
        isTriviaEnabled = Self.flag("FEATURE_TRIVIA", info: info, env: env)
        isLLMSearchEnabled = Self.flag("FEATURE_LLM_SEARCH", info: info, env: env)
        isShabbatModeEnabled = Self.flag("FEATURE_SHABBAT_MODE", info: info, env: env)
        isFamilyControlsEnabled = Self.flag("FEATURE_FAMILY_CONTROLS", info: info, env: env)
        #if os(iOS)
            isWakeWordEnabled = Self.flag("FEATURE_WAKE_WORD", info: info, env: env)
        #endif
        #if os(iOS)
            isCarPlayEnabled = Self.flag("FEATURE_CARPLAY", info: info, env: env)
        #endif
        isAvatarModeEnabled = Self.flag("FEATURE_AVATAR_MODE", info: info, env: env)
        isProactiveVoiceEnabled = Self.flag("FEATURE_PROACTIVE_VOICE", info: info, env: env)
        isInteractiveSubtitlesEnabled = Self.flag("FEATURE_INTERACTIVE_SUBTITLES", info: info, env: env)
        isChapterNavigationEnabled = Self.flag("FEATURE_CHAPTER_NAVIGATION", info: info, env: env)
        isAudiobooksEnabled = Self.flag("FEATURE_AUDIOBOOKS", info: info, env: env)
        isHouseholdEnabled = Self.flag("FEATURE_HOUSEHOLD", info: info, env: env)
        isDevicePairingEnabled = Self.flag("FEATURE_DEVICE_PAIRING", info: info, env: env)
        isRewardsEnabled = Self.flag("FEATURE_REWARDS", info: info, env: env)
        isLegacyFeaturesEnabled = Self.flag("FEATURE_LEGACY_FEATURES", info: info, env: env)
    }

    private static func flag(_ key: String, info: [String: Any], env: [String: String]) -> Bool {
        if let value = info[key] as? String {
            return value.lowercased() == "true" || value == "1"
        }
        if let value = env[key] {
            return value.lowercased() == "true" || value == "1"
        }
        return false
    }
}
