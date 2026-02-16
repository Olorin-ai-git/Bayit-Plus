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

/**
 * Maps trivia categories to icons and colors matching iOS design
 */
object TriviaCategoryStyle {
    private val Blue = Color(0xFF2196F3)
    private val Orange = Color(0xFFFF9800)
    private val Green = Color(0xFF4CAF50)
    private val Purple = Color(0xFF9C27B0)
    private val Amber = Color(0xFFFFC107)

    /**
     * Get icon and color for a trivia category
     */
    fun getIconAndColor(category: String): Pair<ImageVector, Color> {
        return when (category.lowercase()) {
            "cast", "actor", "actress" -> Icons.Default.Person to Blue
            "production", "director", "movie" -> Icons.Default.Movie to Purple
            "historical", "history", "timeline" -> Icons.Default.Schedule to Orange
            "cultural", "culture", "tradition" -> Icons.Default.Public to Green
            "fun", "trivia", "fact" -> Icons.Default.Lightbulb to Amber
            else -> Icons.Default.Info to Purple
        }
    }
}
