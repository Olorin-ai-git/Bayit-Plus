package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun GlassContentCard(
    imageUrl: String?,
    title: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    badge: String? = null,
    progress: Float? = null,
    cardWidth: Dp = DesignTokens.Spacing.xxxxl * 3,
    contentDescription: String? = title,
    aspectRatio: Float = 2f / 3f,
) {
    val shape = RoundedCornerShape(DesignTokens.Radius.md)

    Box(
        modifier = modifier
            .width(cardWidth)
            .aspectRatio(aspectRatio)
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.md,
                backgroundColor = DesignTokens.Colors.Glass.bgLight,
            )
            .clickable(onClick = onClick),
    ) {
        CachedAsyncImage(
            url = imageUrl,
            contentDescription = contentDescription,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )

        badge?.let { badgeText ->
            Text(
                text = badgeText,
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.xs,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(DesignTokens.Spacing.sm)
                    .background(
                        DesignTokens.Colors.Semantic.error,
                        RoundedCornerShape(DesignTokens.Radius.sm),
                    )
                    .padding(
                        horizontal = DesignTokens.Spacing.sm,
                        vertical = DesignTokens.Spacing.xxs,
                    ),
            )
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            DesignTokens.Colors.Glass.bgStrong,
                        ),
                    ),
                )
                .padding(
                    horizontal = DesignTokens.Spacing.sm,
                    vertical = DesignTokens.Spacing.xs,
                ),
        ) {
            Column {
                title?.let { displayTitle ->
                    Text(
                        text = displayTitle,
                        color = DesignTokens.Colors.Text.primary,
                        fontSize = DesignTokens.FontSize.sm,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                subtitle?.let { subtitleText ->
                    Text(
                        text = subtitleText,
                        color = DesignTokens.Colors.Text.secondary,
                        fontSize = DesignTokens.FontSize.xs,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }

        progress?.let { value ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter),
            ) {
                GlassProgressBar(
                    progress = value,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(
                            RoundedCornerShape(
                                bottomStart = DesignTokens.Radius.md,
                                bottomEnd = DesignTokens.Radius.md,
                            ),
                        ),
                )
            }
        }
    }
}
