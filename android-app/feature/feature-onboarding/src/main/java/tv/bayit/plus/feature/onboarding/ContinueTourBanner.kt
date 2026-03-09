package tv.bayit.plus.feature.onboarding

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val MAX_PROMPT_COUNT = 3

@Composable
fun ContinueTourBanner(
    tourDataStore: TourDataStore,
    onContinueTour: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var showBanner by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val state = tourDataStore.load()
        if (state.completionStatus != "in_progress") return@LaunchedEffect
        val promptCount = tourDataStore.getDismissedPromptCount()
        if (promptCount < MAX_PROMPT_COUNT) {
            showBanner = true
        }
    }

    AnimatedVisibility(
        visible = showBanner,
        enter = fadeIn() + slideInVertically { -it },
        exit = fadeOut() + slideOutVertically { -it },
        modifier = modifier,
    ) {
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = stringResource(R.string.continue_tour_title),
                        style = MaterialTheme.typography.titleSmall,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = stringResource(R.string.continue_tour_prompt),
                        style = MaterialTheme.typography.bodySmall,
                        color = DesignTokens.Colors.Text.secondary,
                    )
                }
                GlassButton(
                    text = stringResource(R.string.continue_tour_button),
                    onClick = {
                        showBanner = false
                        onContinueTour()
                    },
                )
                IconButton(
                    onClick = {
                        showBanner = false
                        scope.launch {
                            tourDataStore.incrementDismissedPromptCount()
                        }
                    },
                    modifier = Modifier.size(24.dp),
                ) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = stringResource(R.string.continue_tour_dismiss_description),
                        tint = DesignTokens.Colors.Text.muted,
                    )
                }
            }
        }
    }
}
