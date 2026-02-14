package tv.bayit.plus.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val BayitDarkColorScheme = darkColorScheme(
    primary = Color(0xFF7E22CE),
    primaryContainer = Color(0xFF581C87),
    secondary = Color(0xFFA855F7),
    background = Color(0xFF0D0D1A),
    surface = Color(0xFF1A1A2E),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = Color.White,
    onSurface = Color.White,
)

@Composable
fun BayitTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = BayitDarkColorScheme,
        content = content
    )
}
