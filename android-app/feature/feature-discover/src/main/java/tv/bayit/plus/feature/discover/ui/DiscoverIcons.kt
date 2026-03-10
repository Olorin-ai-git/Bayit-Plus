package tv.bayit.plus.feature.discover.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.AutoStories
import androidx.compose.material.icons.filled.ClosedCaption
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PauseCircle
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material.icons.filled.Subtitles
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.ui.graphics.vector.ImageVector

private val iconMap: Map<String, ImageVector> = mapOf(
    "person_bubble" to Icons.Filled.PauseCircle,
    "captions_bubble" to Icons.Filled.Subtitles,
    "textformat_abc" to Icons.Filled.Translate,
    "sparkles_rectangle_stack" to Icons.Filled.VideoLibrary,
    "globe_americas" to Icons.Filled.Language,
    "character_book_closed_fill" to Icons.Filled.AutoStories,
    "brain_head_profile" to Icons.Filled.Psychology,
    "waveform_and_mic" to Icons.Filled.RecordVoiceOver,
    "text_bubble" to Icons.Filled.ClosedCaption,
    "questionmark_circle" to Icons.Filled.Quiz,
    "clock_arrow_circlepath" to Icons.Filled.Schedule,
    "magnifyingglass_circle" to Icons.Filled.Search,
    "mic_and_signal_meter" to Icons.Filled.Mic,
    "bubble_left_and_text_bubble_right" to Icons.AutoMirrored.Filled.Chat,
    "gamecontroller" to Icons.Filled.SportsEsports,
    "character_book_closed" to Icons.Filled.AutoStories,
    "sparkle_magnifyingglass" to Icons.Filled.Search,
    "waveform" to Icons.Filled.GraphicEq,
    "bubble_left_and_bubble_right_fill" to Icons.Filled.SmartToy,
)

/**
 * Maps an icon name from [tv.bayit.plus.feature.discover.model.DiscoverFeature.iconName]
 * to a Material [ImageVector].
 *
 * Falls back to [Icons.Filled.AutoAwesome] for unmapped names.
 */
internal fun discoverIcon(iconName: String): ImageVector =
    iconMap[iconName] ?: Icons.Filled.AutoAwesome
