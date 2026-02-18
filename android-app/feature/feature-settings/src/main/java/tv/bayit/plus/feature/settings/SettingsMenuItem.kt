package tv.bayit.plus.feature.settings

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.filled.Accessibility
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.FamilyRestroom
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Subtitles
import androidx.compose.material.icons.filled.Subscriptions
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Represents a single item in the main settings menu.
 *
 * @property titleKey The localization key for the item title.
 * @property icon The Material icon displayed beside the title.
 * @property route A string identifier used to navigate to the sub-screen.
 */
data class SettingsMenuItem(
    val titleKey: String,
    val icon: ImageVector,
    val route: String,
)

/**
 * Returns the ordered list of settings menu items. Placed here rather than
 * in the ViewModel so the icon references stay in the UI layer while
 * the ViewModel remains purely data-driven.
 */
fun settingsMenuItems(): List<SettingsMenuItem> = listOf(
    SettingsMenuItem(titleKey = "Profile", icon = Icons.Default.Person, route = "profile"),
    SettingsMenuItem(titleKey = "Language", icon = Icons.Default.Language, route = "language"),
    SettingsMenuItem(titleKey = "Playback", icon = Icons.Default.PlayCircle, route = "playback"),
    SettingsMenuItem(titleKey = "Subtitles", icon = Icons.Default.Subtitles, route = "subtitles"),
    SettingsMenuItem(titleKey = "Audio", icon = Icons.Default.GraphicEq, route = "audio"),
    SettingsMenuItem(titleKey = "AI Features", icon = Icons.Default.AutoAwesome, route = "ai_features"),
    SettingsMenuItem(titleKey = "Accessibility", icon = Icons.Default.Accessibility, route = "accessibility"),
    SettingsMenuItem(titleKey = "Notifications", icon = Icons.Default.Notifications, route = "notifications"),
    SettingsMenuItem(titleKey = "Subscription", icon = Icons.Default.Subscriptions, route = "subscription"),
    SettingsMenuItem(titleKey = "Billing", icon = Icons.Default.Payment, route = "billing"),
    SettingsMenuItem(titleKey = "Security", icon = Icons.Default.Security, route = "security"),
    SettingsMenuItem(titleKey = "Connected Accounts", icon = Icons.Default.Link, route = "accounts"),
    SettingsMenuItem(titleKey = "Family Controls", icon = Icons.Default.FamilyRestroom, route = "family"),
    SettingsMenuItem(titleKey = "Household", icon = Icons.Default.Group, route = "household"),
    SettingsMenuItem(titleKey = "Help", icon = Icons.AutoMirrored.Filled.Help, route = "help"),
)
