package tv.bayit.plus.core.model

import kotlinx.serialization.Serializable

@Serializable
data class AppSettings(
    val language: String = "en",
    val subtitleLanguage: String? = null,
    val audioQuality: String = "auto",
    val videoQuality: String = "auto",
    val autoPlay: Boolean = true,
    val notifications: NotificationSettings = NotificationSettings(),
    val accessibility: AccessibilitySettings = AccessibilitySettings(),
    val subtitles: SubtitleSettings = SubtitleSettings(),
    val audio: AudioSettings = AudioSettings(),
    val playback: PlaybackSettings = PlaybackSettings(),
    val aiFeatures: AIFeaturesSettings = AIFeaturesSettings(),
)

@Serializable
data class NotificationSettings(
    val liveAlerts: Boolean = true,
    val downloadComplete: Boolean = true,
    val socialUpdates: Boolean = true,
    val contentRecommendations: Boolean = true,
    val creditsAlerts: Boolean = true,
    val emailDigest: Boolean = false,
    val emailDigestFrequency: String = "weekly",
    val quietHoursEnabled: Boolean = false,
    val quietHoursStart: String = "22:00",
    val quietHoursEnd: String = "07:00",
)

@Serializable
data class AccessibilitySettings(
    val talkBackEnabled: Boolean = false,
    val fontScale: Float = 1.0f,
    val highContrast: Boolean = false,
    val largeText: Boolean = false,
    val boldText: Boolean = false,
    val reduceMotion: Boolean = false,
    val audioDescriptions: Boolean = false,
    val closedCaptions: Boolean = false,
    val colorBlindMode: String = "none",
)

@Serializable
data class SubtitleSettings(
    val enabled: Boolean = false,
    val language: String = "he",
    val fontSize: Int = 18,
    val textColor: String = "#FFFFFF",
    val backgroundColor: String = "#000000",
    val backgroundOpacity: Float = 0.6f,
    val position: String = "bottom",
    val fontStyle: String = "normal",
    val aiTranslationEnabled: Boolean = false,
    val aiTranslationLanguage: String = "en",
)

@Serializable
data class AudioSettings(
    val preferredLanguage: String = "he",
    val quality: String = "auto",
    val volumeNormalization: Boolean = false,
    val preferDubbed: Boolean = false,
    val dubbingLanguage: String = "en",
)

@Serializable
data class PlaybackSettings(
    val videoQuality: String = "auto",
    val autoplay: Boolean = true,
    val autoplayNextEpisode: Boolean = true,
    val continueWatching: Boolean = true,
    val skipIntro: Boolean = false,
    val skipCredits: Boolean = false,
    val playbackSpeed: Float = 1.0f,
    val hardwareAcceleration: Boolean = true,
    val interactiveMomentsEnabled: Boolean = false,
)

@Serializable
data class AIFeaturesSettings(
    val chatbotEnabled: Boolean = true,
    val personalizedRecommendations: Boolean = true,
    val autoDub: Boolean = false,
    val voicePreference: String = "default",
    val originalAudioMix: Int = 30,
    val triviaEnabled: Boolean = true,
    val triviaAutoShow: Boolean = true,
    val triviaDifficulty: String = "medium",
)
