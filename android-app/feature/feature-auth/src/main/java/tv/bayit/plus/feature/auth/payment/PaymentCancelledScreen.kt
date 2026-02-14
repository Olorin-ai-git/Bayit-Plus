package tv.bayit.plus.feature.auth.payment

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun PaymentCancelledRoute(
    onNavigateToSubscribe: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    PaymentCancelledScreen(
        onNavigateToSubscribe = onNavigateToSubscribe,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun PaymentCancelledScreen(
    onNavigateToSubscribe: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Payment Cancelled")

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(DesignTokens.Spacing.base),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
                ) {
                    Text(
                        text = "✕",
                        fontSize = DesignTokens.FontSize.xxxl,
                        color = DesignTokens.Colors.Semantic.warning,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "Payment Cancelled",
                        style = MaterialTheme.typography.titleLarge,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    )
                    Text(
                        text = "Your payment was cancelled. No charges were made to your account.",
                        style = MaterialTheme.typography.bodyLarge,
                        color = DesignTokens.Colors.Text.secondary,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(DesignTokens.Spacing.sm))
                    Text(
                        text = "You can try again anytime to unlock all Bayit+ premium features.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.Colors.Text.muted,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            Spacer(Modifier.height(DesignTokens.Spacing.xxl))

            GlassButton(
                text = "Try Again",
                onClick = onNavigateToSubscribe,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(DesignTokens.Spacing.sm))

            GlassButton(
                text = "Go Back",
                onClick = onNavigateBack,
                isPrimary = false,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
