package tv.bayit.plus.designsystem.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val BayitColorScheme = darkColorScheme(
    primary = DesignTokens.Colors.Primary.base,
    onPrimary = DesignTokens.Colors.Text.primary,
    secondary = DesignTokens.Colors.Secondary.s800,
    onSecondary = DesignTokens.Colors.Text.primary,
    tertiary = DesignTokens.Colors.Primary.light,
    background = DesignTokens.Colors.Background.primary,
    onBackground = DesignTokens.Colors.Text.primary,
    surface = DesignTokens.Colors.Background.elevated,
    onSurface = DesignTokens.Colors.Text.primary,
    error = DesignTokens.Colors.Semantic.error,
    onError = DesignTokens.Colors.Text.primary,
)

@Composable
fun BayitPlusTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = false
                isAppearanceLightNavigationBars = false
            }
        }
    }

    MaterialTheme(
        colorScheme = BayitColorScheme,
        content = content,
    )
}
