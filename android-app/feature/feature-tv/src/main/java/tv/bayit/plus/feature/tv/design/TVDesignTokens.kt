package tv.bayit.plus.feature.tv.design

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

object TVDesignTokens {
    object Spacing {
        val cardPadding: Dp = 48.dp
        val rowSpacing: Dp = 24.dp
        val itemSpacing: Dp = 16.dp
        val sectionPadding: Dp = 40.dp
        val focusBorderWidth: Dp = 3.dp
        val screenPadding: Dp = 48.dp
        val heroOverlayPadding: Dp = 64.dp
    }

    object FontSize {
        val body: TextUnit = 16.sp
        val bodyLarge: TextUnit = 18.sp
        val title: TextUnit = 24.sp
        val titleLarge: TextUnit = 28.sp
        val hero: TextUnit = 36.sp
        val heroLarge: TextUnit = 48.sp
        val label: TextUnit = 14.sp
        val caption: TextUnit = 12.sp
    }

    object Card {
        val portraitWidth: Dp = 200.dp
        val portraitHeight: Dp = 300.dp
        val landscapeWidth: Dp = 320.dp
        val landscapeHeight: Dp = 180.dp
        val focusScale: Float = 1.05f
        val cornerRadius: Dp = 12.dp
    }

    object Hero {
        val height: Dp = 400.dp
        val autoAdvanceIntervalMs: Long = 8000L
        val contentPadding: Dp = 48.dp
        val indicatorPadding: Dp = 16.dp
        val titleSize: TextUnit = 36.sp
    }

    object Player {
        val controlsAutoHideMs: Long = 5000L
        val seekIncrementMs: Long = 10000L
        val progressBarHeight: Dp = 4.dp
        val progressBarFocusedHeight: Dp = 8.dp
        val overlayPaddingHorizontal: Dp = 48.dp
        val overlayPaddingVertical: Dp = 24.dp
    }
}
