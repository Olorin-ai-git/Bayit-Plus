package tv.bayit.plus.feature.player.live.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Maps trivia categories to icons and colors using DesignTokens
 */
object TriviaCategoryStyle {
    /**
     * Get icon and color for a trivia category
     */
    fun getIconAndColor(category: String): Pair<ImageVector, Color> {
        return when (category.lowercase()) {
            "cast", "actor", "actress" -> Icons.Default.Person to DesignTokens.Colors.Semantic.info
            "production", "director", "movie" -> Icons.Default.Movie to DesignTokens.Colors.Primary.base
            "historical", "history", "timeline" -> Icons.Default.Schedule to DesignTokens.Colors.Semantic.warning
            "cultural", "culture", "tradition" -> Icons.Default.Public to DesignTokens.Colors.Semantic.success
            "fun", "trivia", "fact" -> Icons.Default.Lightbulb to DesignTokens.Colors.Semantic.warningLight
            else -> Icons.Default.Info to DesignTokens.Colors.Primary.base
        }
    }
}
