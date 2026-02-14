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
)

@Serializable
data class NotificationSettings(
    val liveAlerts: Boolean = true,
    val downloadComplete: Boolean = true,
    val socialUpdates: Boolean = true,
    val contentRecommendations: Boolean = true,
)

@Serializable
data class AccessibilitySettings(
    val talkBackEnabled: Boolean = false,
    val fontScale: Float = 1.0f,
    val highContrast: Boolean = false,
)
