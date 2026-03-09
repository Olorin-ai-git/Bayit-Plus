// # DEMO-ONLY
package tv.bayit.plus.feature.onboarding.demos

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.feature.onboarding.InlineVideoPlayer
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.R

private const val DEMO_ASSET_SUBTITLE = "demos/subtitle_clip.mp4"
private const val VIDEO_ASPECT_RATIO = 16f / 9f

private enum class SubtitleMode(val labelResId: Int, val textResId: Int) {
    ORIGINAL(R.string.demo_subtitle_mode_original, R.string.demo_subtitle_original_text),
    NIKUD(R.string.demo_subtitle_mode_nikud, R.string.demo_subtitle_nikud_text),
    ENGREW(R.string.demo_subtitle_mode_engrew, R.string.demo_subtitle_engrew_text),
    HEBLISH(R.string.demo_subtitle_mode_heblish, R.string.demo_subtitle_heblish_text),
}

@Composable
fun SubtitleDemoComposable(
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val modes = SubtitleMode.entries
    var selectedIndex by remember { mutableIntStateOf(0) }
    val currentMode = modes[selectedIndex]

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary),
    ) {
        DemoTopBar(
            label = stringResource(R.string.demo_banner_label),
            onClose = onClose,
        )

        Box(modifier = Modifier.fillMaxWidth().aspectRatio(VIDEO_ASPECT_RATIO)) {
            InlineVideoPlayer(
                assetPath = DEMO_ASSET_SUBTITLE,
                modifier = Modifier.fillMaxSize(),
            )

            AnimatedContent(
                targetState = currentMode,
                label = "subtitle_crossfade",
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(DesignTokens.Colors.Glass.bgStrong)
                    .padding(DesignTokens.Spacing.md),
            ) { mode ->
                Text(
                    text = stringResource(mode.textResId),
                    style = MaterialTheme.typography.bodyLarge,
                    color = DesignTokens.Colors.Text.primary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.base),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            itemsIndexed(modes.toList()) { index, mode ->
                GlassChip(
                    label = stringResource(mode.labelResId),
                    isSelected = index == selectedIndex,
                    onClick = { selectedIndex = index },
                )
            }
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
