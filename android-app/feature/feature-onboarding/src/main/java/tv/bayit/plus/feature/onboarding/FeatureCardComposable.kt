package tv.bayit.plus.feature.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun FeatureCardComposable(
    card: FeatureCard,
    videoUri: String?,
    onTryItNow: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val layoutDirection = LocalLayoutDirection.current
    val textAlign = if (layoutDirection == LayoutDirection.Rtl) {
        TextAlign.Right
    } else {
        TextAlign.Left
    }

    val titleText = stringResource(card.titleResId)
    val taglineText = stringResource(card.taglineResId)
    val cardA11y = stringResource(R.string.a11y_feature_card_title, titleText)
    val tryItA11y = stringResource(R.string.a11y_try_it_now_button, titleText)

    Box(modifier = modifier.fillMaxSize().semantics { contentDescription = cardA11y }) {
        if (videoUri != null) {
            InlineVideoPlayer(uri = videoUri, modifier = Modifier.fillMaxSize())
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(DesignTokens.Colors.Background.primary),
            )
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.4f),
                            Color.Black.copy(alpha = 0.85f),
                        ),
                    ),
                ),
        )

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .padding(DesignTokens.Spacing.xl),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                ) {
                    Text(
                        text = titleText,
                        style = MaterialTheme.typography.headlineSmall,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.Bold,
                        textAlign = textAlign,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(
                        text = taglineText,
                        style = MaterialTheme.typography.bodyLarge,
                        color = DesignTokens.Colors.Text.secondary,
                        textAlign = textAlign,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
            GlassButton(
                text = stringResource(R.string.tour_try_it_now),
                onClick = onTryItNow,
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { contentDescription = tryItA11y },
            )
        }
    }
}
