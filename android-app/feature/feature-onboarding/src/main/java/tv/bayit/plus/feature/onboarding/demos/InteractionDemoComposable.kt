// # DEMO-ONLY
package tv.bayit.plus.feature.onboarding.demos

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.R

private const val FRAME_ASSET = "demos/interaction_frame.webp"
private const val FRAME_ASPECT_RATIO = 16f / 9f
private const val CHARACTER_X_FRACTION = 0.35f
private const val CHARACTER_Y_FRACTION = 0.2f
private const val TOTAL_MESSAGES = 3

@Composable
fun InteractionDemoComposable(
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var revealedCount by remember { mutableIntStateOf(0) }

    val messages = listOf(
        stringResource(R.string.demo_interaction_msg_1),
        stringResource(R.string.demo_interaction_msg_2),
        stringResource(R.string.demo_interaction_msg_3),
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary),
    ) {
        DemoTopBar(
            label = stringResource(R.string.demo_banner_label),
            onClose = onClose,
        )

        Box(modifier = Modifier.fillMaxWidth().aspectRatio(FRAME_ASPECT_RATIO)) {
            tv.bayit.plus.designsystem.component.CachedAsyncImage(
                url = "file:///android_asset/$FRAME_ASSET",
                contentDescription = stringResource(R.string.demo_interaction_character_name),
                modifier = Modifier.fillMaxSize(),
            )

            Box(
                modifier = Modifier
                    .offset(x = (CHARACTER_X_FRACTION * 300).dp, y = (CHARACTER_Y_FRACTION * 200).dp)
                    .size(80.dp, 100.dp)
                    .border(2.dp, DesignTokens.Colors.Primary.light, RoundedCornerShape(DesignTokens.Radius.default))
                    .clickable { if (revealedCount < TOTAL_MESSAGES) revealedCount++ },
            )

            if (revealedCount == 0) {
                Text(
                    text = stringResource(R.string.demo_interaction_tap_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = DesignTokens.Colors.Text.primary,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(DesignTokens.Spacing.md)
                        .background(DesignTokens.Colors.Glass.bgStrong, RoundedCornerShape(DesignTokens.Radius.sm))
                        .padding(horizontal = DesignTokens.Spacing.md, vertical = DesignTokens.Spacing.xs),
                )
            }
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        Column(
            modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            messages.forEachIndexed { index, message ->
                AnimatedVisibility(
                    visible = index < revealedCount,
                    enter = fadeIn() + slideInVertically { it / 2 },
                ) {
                    ChatBubble(
                        characterName = stringResource(R.string.demo_interaction_character_name),
                        message = message,
                    )
                }
            }
        }

        AnimatedVisibility(
            visible = revealedCount >= TOTAL_MESSAGES,
            enter = fadeIn() + slideInVertically { it / 2 },
            modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base),
        ) {
            CuratedMomentsTooltip()
        }

        AnimatedVisibility(
            visible = revealedCount >= TOTAL_MESSAGES,
            enter = fadeIn(),
            modifier = Modifier.padding(horizontal = DesignTokens.Spacing.base),
        ) {
            Text(
                text = stringResource(R.string.demo_interaction_credit_info),
                style = MaterialTheme.typography.bodySmall,
                color = DesignTokens.Colors.Text.muted,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = DesignTokens.Spacing.sm),
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        GlassButton(
            text = stringResource(R.string.demo_close),
            onClick = onClose,
            isPrimary = false,
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.base),
        )
    }
}

@Composable
private fun CuratedMomentsTooltip() {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            Icon(
                Icons.Default.Star,
                contentDescription = null,
                tint = DesignTokens.Colors.Primary.light,
                modifier = Modifier.size(20.dp),
            )
            Text(
                text = stringResource(R.string.demo_interaction_curated_moments),
                style = MaterialTheme.typography.bodySmall,
                color = DesignTokens.Colors.Text.secondary,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun ChatBubble(characterName: String, message: String) {
    Row(
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(DesignTokens.Colors.Primary.dark),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = characterName.first().toString(),
                style = MaterialTheme.typography.labelMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
            )
        }
        GlassCard {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.primary,
            )
        }
    }
}
