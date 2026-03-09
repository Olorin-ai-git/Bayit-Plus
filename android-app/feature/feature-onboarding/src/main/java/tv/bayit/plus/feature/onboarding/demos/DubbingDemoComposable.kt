// # DEMO-ONLY
package tv.bayit.plus.feature.onboarding.demos

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.feature.onboarding.InlineVideoPlayer
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.R

private const val DEMO_ASSET_ORIGINAL = "demos/dubbing_original.mp4"
private const val DEMO_ASSET_DUBBED = "demos/dubbing_dubbed.mp4"
private const val VIDEO_ASPECT_RATIO = 16f / 9f

@Composable
fun DubbingDemoComposable(
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showDubbed by remember { mutableStateOf(false) }
    val currentAsset = if (showDubbed) DEMO_ASSET_DUBBED else DEMO_ASSET_ORIGINAL

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary),
    ) {
        DemoTopBar(
            label = stringResource(R.string.demo_banner_label),
            onClose = onClose,
        )

        Crossfade(
            targetState = currentAsset,
            label = "dubbing_crossfade",
        ) { asset ->
            InlineVideoPlayer(
                assetPath = asset,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(VIDEO_ASPECT_RATIO),
            )
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.base))

        GlassCard(modifier = Modifier.fillMaxWidth().padding(horizontal = DesignTokens.Spacing.base)) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                Text(
                    text = if (showDubbed) {
                        stringResource(R.string.demo_dubbing_label_dubbed)
                    } else {
                        stringResource(R.string.demo_dubbing_label_original)
                    },
                    style = MaterialTheme.typography.titleMedium,
                    color = DesignTokens.Colors.Text.primary,
                )

                Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                    GlassChip(
                        label = stringResource(R.string.demo_dubbing_original),
                        isSelected = !showDubbed,
                        onClick = { showDubbed = false },
                    )
                    GlassChip(
                        label = stringResource(R.string.demo_dubbing_dubbed),
                        isSelected = showDubbed,
                        onClick = { showDubbed = true },
                    )
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Box(
            modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.base),
            contentAlignment = Alignment.Center,
        ) {
            tv.bayit.plus.designsystem.component.GlassButton(
                text = stringResource(R.string.demo_close),
                onClick = onClose,
                isPrimary = false,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
