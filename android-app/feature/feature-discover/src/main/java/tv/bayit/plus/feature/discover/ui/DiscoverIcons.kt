package tv.bayit.plus.feature.discover.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.ManageSearch
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Assistant
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.ClosedCaption
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.ImageSearch
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.PauseCircle
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material.icons.filled.Subtitles
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material.icons.filled.Translate
import androidx.compose.material.icons.filled.Tv
import androidx.compose.ui.graphics.vector.ImageVector

internal fun discoverIcon(name: String): ImageVector = when (name) {
    "pause_circle" -> Icons.Default.PauseCircle
    "subtitles" -> Icons.Default.Subtitles
    "book" -> Icons.Default.Book
    "auto_awesome" -> Icons.Default.AutoAwesome
    "public" -> Icons.Default.Public
    "translate" -> Icons.Default.Translate
    "smart_toy" -> Icons.Default.SmartToy
    "record_voice_over" -> Icons.Default.RecordVoiceOver
    "closed_caption" -> Icons.Default.ClosedCaption
    "quiz" -> Icons.Default.Quiz
    "fast_forward" -> Icons.Default.FastForward
    "image_search" -> Icons.Default.ImageSearch
    "mic" -> Icons.Default.Mic
    "forum" -> Icons.Default.Forum
    "flag" -> Icons.Default.Flag
    "menu_book" -> Icons.AutoMirrored.Filled.MenuBook
    "manage_search" -> Icons.AutoMirrored.Filled.ManageSearch
    "assistant" -> Icons.Default.Assistant
    "support_agent" -> Icons.Default.SupportAgent
    "film" -> Icons.Default.Movie
    "tv" -> Icons.Default.Tv
    "search" -> Icons.Default.Search
    "chat" -> Icons.AutoMirrored.Filled.Chat
    else -> Icons.Default.AutoAwesome
}
