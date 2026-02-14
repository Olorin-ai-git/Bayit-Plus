package tv.bayit.plus.designsystem.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

object DesignTokens {
    object Colors {
        object Primary {
            val base = Color(0xFF7E22CE)
            val light = Color(0xFFA855F7)
            val dark = Color(0xFF581C87)
            val p50 = Color(0xFFFAF5FF)
            val p100 = Color(0xFFF3E8FF)
            val p200 = Color(0xFFE9D5FF)
            val p300 = Color(0xFFD8B4FE)
            val p400 = Color(0xFFC084FC)
            val p500 = Color(0xFFA855F7)
            val p600 = Color(0xFF9333EA)
            val p700 = Color(0xFF7E22CE)
            val p800 = Color(0xFF6B21A8)
            val p900 = Color(0xFF581C87)
            val p950 = Color(0xFF3B0764)
        }

        object Secondary {
            val s400 = Color(0xFFE879F9)
            val s500 = Color(0xFFD946EF)
            val s600 = Color(0xFFC026D3)
            val s700 = Color(0xFFA21CAF)
            val s800 = Color(0xFF86198F)
        }

        object Semantic {
            val success = Color(0xFF10B981)
            val successLight = Color(0xFF4ADE80)
            val successDark = Color(0xFF059669)
            val warning = Color(0xFFF59E0B)
            val warningLight = Color(0xFFFBBF24)
            val warningDark = Color(0xFFD97706)
            val error = Color(0xFFEF4444)
            val errorLight = Color(0xFFF87171)
            val errorDark = Color(0xFFDC2626)
            val info = Color(0xFF3B82F6)
            val infoLight = Color(0xFF60A5FA)
            val infoDark = Color(0xFF2563EB)
        }

        object Text {
            val primary = Color.White
            val secondary = Color.White.copy(alpha = 0.7f)
            val muted = Color.White.copy(alpha = 0.5f)
            val disabled = Color.White.copy(alpha = 0.3f)
        }

        object Glass {
            val bg = Color.Black.copy(alpha = 0.7f)
            val bgLight = Color.Black.copy(alpha = 0.5f)
            val bgMedium = Color.Black.copy(alpha = 0.6f)
            val bgStrong = Color.Black.copy(alpha = 0.85f)
            val border = Color(0xFF7E22CE).copy(alpha = 0.25f)
            val borderLight = Color(0xFF7E22CE).copy(alpha = 0.15f)
            val borderFocus = Color(0xFF7E22CE).copy(alpha = 0.7f)
            val purpleLight = Color(0xFF581C87).copy(alpha = 0.35f)
            val purpleStrong = Color(0xFF581C87).copy(alpha = 0.55f)
            val purpleGlow = Color(0xFF7E22CE).copy(alpha = 0.35f)
        }

        object Background {
            val primary = Color(0xFF0D0D1A)
            val elevated = Color(0xFF1A1A2E)
        }

        val live = Color(0xFFFF4444)
        val gold = Color(0xFFFFD700)
    }

    object Spacing {
        val xxs: Dp = 2.dp
        val xs: Dp = 4.dp
        val sm: Dp = 8.dp
        val md: Dp = 12.dp
        val base: Dp = 16.dp
        val lg: Dp = 20.dp
        val xl: Dp = 24.dp
        val xxl: Dp = 32.dp
        val xxxl: Dp = 40.dp
        val xxxxl: Dp = 48.dp
    }

    object Radius {
        val sm: Dp = 4.dp
        val default: Dp = 8.dp
        val md: Dp = 12.dp
        val lg: Dp = 16.dp
        val xl: Dp = 24.dp
        val xxl: Dp = 32.dp
        val full: Dp = 9999.dp
    }

    object FontSize {
        val xs: TextUnit = 10.sp
        val sm: TextUnit = 12.sp
        val base: TextUnit = 14.sp
        val md: TextUnit = 16.sp
        val lg: TextUnit = 18.sp
        val xl: TextUnit = 20.sp
        val xxl: TextUnit = 24.sp
        val xxxl: TextUnit = 30.sp
        val display: TextUnit = 36.sp
        val hero: TextUnit = 48.sp
    }

    object TouchTarget {
        val minimum: Dp = 48.dp
    }
}
