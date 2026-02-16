package tv.bayit.plus.feature.player.chapters

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Chapter navigation markers displayed on the seek bar.
 *
 * Draws small vertical markers at each chapter boundary position
 * on the progress slider, allowing users to visually identify
 * chapter transitions during scrubbing.
 */
@Composable
fun ChapterNavigation(
    chapters: List<ChapterMarker>,
    totalDurationMs: Long,
    modifier: Modifier = Modifier,
) {
    if (chapters.isEmpty() || totalDurationMs <= 0) return

    Box(modifier = modifier.fillMaxWidth().height(MARKER_HEIGHT)) {
        Canvas(modifier = Modifier.fillMaxWidth().height(MARKER_HEIGHT)) {
            val width = size.width
            val markerColor = DesignTokens.Colors.Primary.light

            chapters.forEach { chapter ->
                val fraction = (chapter.startTimeMs.toFloat() / totalDurationMs).coerceIn(0f, 1f)
                val x = fraction * width

                drawLine(
                    color = markerColor,
                    start = Offset(x, 0f),
                    end = Offset(x, size.height),
                    strokeWidth = MARKER_STROKE_WIDTH,
                )
            }
        }
    }
}

/**
 * Visual chapter markers overlay on the seek bar.
 */
@Composable
fun ChapterMarkers(
    chapters: List<ChapterMarker>,
    totalDurationMs: Long,
    currentPositionMs: Long,
    modifier: Modifier = Modifier,
) {
    ChapterNavigation(
        chapters = chapters,
        totalDurationMs = totalDurationMs,
        modifier = modifier,
    )
}

data class ChapterMarker(
    val startTimeMs: Long,
    val title: String,
    val index: Int,
)

private val MARKER_HEIGHT = 12.dp
private const val MARKER_STROKE_WIDTH = 2f
