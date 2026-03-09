package tv.bayit.plus.designsystem.icons

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Router
import androidx.compose.material.icons.filled.SettingsInputAntenna
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp

object BayitIcons {
    val Tv: ImageVector = Icons.Default.Tv
    val Film: ImageVector = Icons.Default.Movie
    val Headphones: ImageVector = Icons.Default.Headphones

    val Plex: ImageVector by lazy { buildPlexIcon() }
    val YouTube: ImageVector = Icons.Default.PlayArrow
    val Xtream: ImageVector = Icons.Default.SettingsInputAntenna
    val Iptv: ImageVector = Icons.Default.Router

    private fun buildPlexIcon(): ImageVector {
        return ImageVector.Builder(
            name = "Plex",
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f,
        ).apply {
            path(
                fill = SolidColor(Color.White),
                pathFillType = PathFillType.EvenOdd,
            ) {
                moveTo(4f, 2f)
                lineTo(10.5f, 12f)
                lineTo(4f, 22f)
                lineTo(8f, 22f)
                lineTo(12f, 16f)
                lineTo(16f, 22f)
                lineTo(20f, 22f)
                lineTo(13.5f, 12f)
                lineTo(20f, 2f)
                lineTo(16f, 2f)
                lineTo(12f, 8f)
                lineTo(8f, 2f)
                close()
            }
        }.build()
    }
}
