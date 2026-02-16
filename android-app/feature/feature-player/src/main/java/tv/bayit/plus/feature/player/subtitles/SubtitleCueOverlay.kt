package tv.bayit.plus.feature.player.subtitles

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import tv.bayit.plus.core.model.SubtitleCue
import tv.bayit.plus.core.model.SubtitleHebrewMode
import tv.bayit.plus.core.model.TranslationResult
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Interactive subtitle overlay positioned above the player controls.
 *
 * Displays the currently active subtitle cue with word-level tap-to-translate
 * support. Words are rendered as tappable buttons; tapping a word triggers
 * a translation request and shows a popover with the result.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SubtitleCueOverlay(
    activeCue: SubtitleCue?,
    hebrewMode: SubtitleHebrewMode,
    translationResult: TranslationResult?,
    onWordTap: (String) -> Unit,
    onDismissTranslation: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(
                horizontal = DesignTokens.Spacing.xl,
                vertical = DesignTokens.Spacing.md,
            ),
        contentAlignment = Alignment.BottomCenter,
    ) {
        AnimatedVisibility(
            visible = activeCue != null,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            activeCue?.let { cue ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    translationResult?.let { result ->
                        TranslationPopover(
                            result = result,
                            onDismiss = onDismissTranslation,
                        )
                    }

                    CueContent(
                        cue = cue,
                        hebrewMode = hebrewMode,
                        onWordTap = onWordTap,
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CueContent(
    cue: SubtitleCue,
    hebrewMode: SubtitleHebrewMode,
    onWordTap: (String) -> Unit,
) {
    val displayText = resolveDisplayText(cue, hebrewMode)
    val words = cue.words

    Box(
        modifier = Modifier
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.md,
                backgroundColor = DesignTokens.Colors.Glass.bgStrong,
            )
            .padding(
                horizontal = DesignTokens.Spacing.md,
                vertical = DesignTokens.Spacing.sm,
            ),
    ) {
        if (!words.isNullOrEmpty()) {
            FlowRow(
                horizontalArrangement = Arrangement.Center,
                verticalArrangement = Arrangement.Center,
            ) {
                words.forEach { word ->
                    word.word?.let { text ->
                        WordButton(
                            text = text,
                            isHebrew = word.isHebrew ?: false,
                            onClick = { onWordTap(text) },
                        )
                    }
                }
            }
        } else if (displayText != null) {
            SubtitleTextFallback(text = displayText)
        }
    }
}

private fun resolveDisplayText(cue: SubtitleCue, mode: SubtitleHebrewMode): String? =
    when (mode) {
        SubtitleHebrewMode.NIKUD -> cue.textNikud ?: cue.text
        SubtitleHebrewMode.SHORESH -> cue.textShoresh ?: cue.text
        SubtitleHebrewMode.HEBLISH -> cue.textHeblish ?: cue.text
        SubtitleHebrewMode.STANDARD -> cue.text
    }
