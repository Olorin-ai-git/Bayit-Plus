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
    let isBeta500Enabled: Bool
    #if os(iOS)
    let isPasskeyEnabled: Bool
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

        self.isLiveDubbingEnabled = Self.flag("FEATURE_LIVE_DUBBING", info: info, env: env)
        self.isTriviaEnabled = Self.flag("FEATURE_TRIVIA", info: info, env: env)
        self.isLLMSearchEnabled = Self.flag("FEATURE_LLM_SEARCH", info: info, env: env)
        self.isShabbatModeEnabled = Self.flag("FEATURE_SHABBAT_MODE", info: info, env: env)
        self.isFamilyControlsEnabled = Self.flag("FEATURE_FAMILY_CONTROLS", info: info, env: env)
        #if os(iOS)
        self.isWakeWordEnabled = Self.flag("FEATURE_WAKE_WORD", info: info, env: env)
        #endif
        self.isBeta500Enabled = Self.flag("FEATURE_BETA_500", info: info, env: env)
        #if os(iOS)
        self.isPasskeyEnabled = Self.flag("FEATURE_PASSKEY", info: info, env: env)
        self.isCarPlayEnabled = Self.flag("FEATURE_CARPLAY", info: info, env: env)
        #endif
        self.isAvatarModeEnabled = Self.flag("FEATURE_AVATAR_MODE", info: info, env: env)
        self.isProactiveVoiceEnabled = Self.flag("FEATURE_PROACTIVE_VOICE", info: info, env: env)
        self.isInteractiveSubtitlesEnabled = Self.flag("FEATURE_INTERACTIVE_SUBTITLES", info: info, env: env)
        self.isChapterNavigationEnabled = Self.flag("FEATURE_CHAPTER_NAVIGATION", info: info, env: env)
        self.isAudiobooksEnabled = Self.flag("FEATURE_AUDIOBOOKS", info: info, env: env)
        self.isHouseholdEnabled = Self.flag("FEATURE_HOUSEHOLD", info: info, env: env)
        self.isDevicePairingEnabled = Self.flag("FEATURE_DEVICE_PAIRING", info: info, env: env)
        self.isRewardsEnabled = Self.flag("FEATURE_REWARDS", info: info, env: env)
        self.isLegacyFeaturesEnabled = Self.flag("FEATURE_LEGACY_FEATURES", info: info, env: env)
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
