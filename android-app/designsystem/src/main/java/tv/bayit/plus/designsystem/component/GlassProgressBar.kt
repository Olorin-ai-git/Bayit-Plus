package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun GlassProgressBar(
    progress: Float,
    modifier: Modifier = Modifier,
) {
    LinearProgressIndicator(
        progress = { progress.coerceIn(0f, 1f) },
        modifier = modifier
            .fillMaxWidth()
            .height(4.dp)
            .clip(RoundedCornerShape(DesignTokens.Radius.full)),
        color = DesignTokens.Colors.Primary.light,
        trackColor = DesignTokens.Colors.Glass.border,
    )
}
