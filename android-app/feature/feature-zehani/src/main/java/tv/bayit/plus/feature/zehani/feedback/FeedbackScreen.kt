package tv.bayit.plus.feature.zehani.feedback

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

private val STAR_SIZE = 40.dp

@Composable
fun FeedbackRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: FeedbackViewModel = hiltViewModel(),
) {
    val feedbackText by viewModel.feedbackText.collectAsStateWithLifecycle()
    val rating by viewModel.rating.collectAsStateWithLifecycle()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    FeedbackScreen(
        feedbackText = feedbackText,
        rating = rating,
        uiState = uiState,
        onFeedbackTextChange = viewModel::updateFeedbackText,
        onRatingChange = viewModel::updateRating,
        onSubmit = viewModel::submitFeedback,
        onResetToIdle = viewModel::resetToIdle,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun FeedbackScreen(
    feedbackText: String,
    rating: Int,
    uiState: FeedbackUiState,
    onFeedbackTextChange: (String) -> Unit,
    onRatingChange: (Int) -> Unit,
    onSubmit: () -> Unit,
    onResetToIdle: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("zehAni.feedback.title"))
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
        ) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                    Text(
                        text = bayitString("zehAni.feedback.rateQuestion"),
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                    RatingStars(rating = rating, onRatingChange = onRatingChange)
                }
            }

            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                    Text(
                        text = bayitString("zehAni.feedback.tellUsMore"),
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                    GlassTextField(
                        value = feedbackText,
                        onValueChange = onFeedbackTextChange,
                        placeholder = bayitString("zehAni.feedback.sharePlaceholder"),
                        singleLine = false,
                    )
                }
            }

            when (uiState) {
                is FeedbackUiState.Idle -> {
                    GlassButton(
                        text = bayitString("zehAni.feedback.submit"),
                        onClick = onSubmit,
                        enabled = feedbackText.isNotBlank(),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                is FeedbackUiState.Submitting -> {
                    GlassSpinner(size = SpinnerSize.MEDIUM, modifier = Modifier.align(Alignment.CenterHorizontally))
                }
                is FeedbackUiState.Success -> {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = bayitString("zehAni.feedback.thankYou"),
                                style = MaterialTheme.typography.titleMedium,
                                color = DesignTokens.Colors.Semantic.success,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(Modifier.height(DesignTokens.Spacing.sm))
                            Text(
                                text = bayitString("zehAni.feedback.appreciateInput"),
                                style = MaterialTheme.typography.bodyMedium,
                                color = DesignTokens.Colors.Text.secondary,
                            )
                            Spacer(Modifier.height(DesignTokens.Spacing.md))
                            GlassButton(
                                text = bayitString("zehAni.feedback.sendMore"),
                                onClick = onResetToIdle,
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }
                }
                is FeedbackUiState.Error -> {
                    Text(
                        text = uiState.message,
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.Colors.Semantic.error,
                    )
                    GlassButton(
                        text = bayitString("common.tryAgain"),
                        onClick = onSubmit,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}

@Composable
private fun RatingStars(rating: Int, onRatingChange: (Int) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        (1..5).forEach { star ->
            val isSelected = star <= rating
            Text(
                text = if (isSelected) "★" else "☆",
                fontSize = DesignTokens.FontSize.xl,
                color = if (isSelected) DesignTokens.Colors.gold else DesignTokens.Colors.Text.muted,
                modifier = Modifier.clickable { onRatingChange(star) },
            )
        }
    }
}
