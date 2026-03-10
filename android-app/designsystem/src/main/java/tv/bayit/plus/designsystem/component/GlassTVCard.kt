package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun GlassTVCard(
    title: String,
    thumbnailUrl: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    progressPercent: Float? = null,
    isLive: Boolean = false,
    width: Dp = 320.dp,
    height: Dp = 180.dp,
) {
    var isFocused by remember { mutableStateOf(false) }
    val borderColor = if (isFocused) {
        DesignTokens.Colors.Glass.borderFocus
    } else {
        Color.Transparent
    }
    val scale = if (isFocused) 1.05f else 1f
    val shape = RoundedCornerShape(12.dp)

    Box(
        modifier = modifier
            .width(width)
            .onFocusChanged { isFocused = it.isFocused }
            .focusable()
            .clickable { onClick() },
    ) {
        Column {
            Box(
                modifier = Modifier
                    .width(width)
                    .height(height)
                    .clip(shape),
            ) {
                CachedAsyncImage(
                    url = thumbnailUrl,
                    contentDescription = title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )

                if (isLive) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(DesignTokens.Spacing.sm)
                            .background(
                                DesignTokens.Colors.Semantic.error,
                                RoundedCornerShape(4.dp),
                            )
                            .padding(
                                horizontal = DesignTokens.Spacing.xs,
                                vertical = DesignTokens.Spacing.xxs,
                            ),
                    ) {
                        androidx.compose.material3.Text(
                            text = bayitString("common.live"),
                            style = androidx.compose.material3.MaterialTheme.typography.labelSmall,
                            color = Color.White,
                        )
                    }
                }

                progressPercent?.let { progress ->
                    if (progress in 0.01f..0.99f) {
                        GlassProgressBar(
                            progress = progress,
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .fillMaxWidth()
                                .height(4.dp),
                        )
                    }
                }
            }

            androidx.compose.material3.Text(
                text = title,
                style = androidx.compose.material3.MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.primary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(
                    top = DesignTokens.Spacing.sm,
                    start = DesignTokens.Spacing.xs,
                ),
            )

            subtitle?.let {
                androidx.compose.material3.Text(
                    text = it,
                    style = androidx.compose.material3.MaterialTheme.typography.bodySmall,
                    color = DesignTokens.Colors.Text.secondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(
                        start = DesignTokens.Spacing.xs,
                    ),
                )
            }
        }

        if (isFocused) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .clip(shape)
                    .then(
                        Modifier.padding(0.dp)
                    ),
            )
        }
    }
}
