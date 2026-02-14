package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun GlassLoadingIndicator(
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(
            modifier = Modifier.size(48.dp),
            color = DesignTokens.Colors.Primary.light,
            trackColor = DesignTokens.Colors.Glass.border,
        )
    }
}

@Composable
fun GlassSpinner(
    modifier: Modifier = Modifier,
    size: SpinnerSize = SpinnerSize.MEDIUM,
) {
    val sizeValue = when (size) {
        SpinnerSize.SMALL -> 24.dp
        SpinnerSize.MEDIUM -> 48.dp
        SpinnerSize.LARGE -> 64.dp
    }
    CircularProgressIndicator(
        modifier = modifier.size(sizeValue),
        color = DesignTokens.Colors.Primary.light,
        trackColor = DesignTokens.Colors.Glass.border,
        strokeWidth = when (size) {
            SpinnerSize.SMALL -> 2.dp
            SpinnerSize.MEDIUM -> 3.dp
            SpinnerSize.LARGE -> 4.dp
        },
    )
}

enum class SpinnerSize { SMALL, MEDIUM, LARGE }
