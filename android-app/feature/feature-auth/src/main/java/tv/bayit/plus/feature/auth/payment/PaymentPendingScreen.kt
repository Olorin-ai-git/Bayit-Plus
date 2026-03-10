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
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun PaymentPendingRoute(
    onNavigateToHome: () -> Unit,
    modifier: Modifier = Modifier,
) {
    PaymentPendingScreen(
        onNavigateToHome = onNavigateToHome,
        modifier = modifier,
    )
}

@Composable
internal fun PaymentPendingScreen(
    onNavigateToHome: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("payment.pending.title"))

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
                    GlassSpinner(size = SpinnerSize.LARGE)
                    Text(
                        text = bayitString("payment.pending.title"),
                        style = MaterialTheme.typography.titleLarge,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center,
                    )
                    Text(
                        text = bayitString("payment.pending.message"),
                        style = MaterialTheme.typography.bodyLarge,
                        color = DesignTokens.Colors.Text.secondary,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(DesignTokens.Spacing.sm))
                    Text(
                        text = bayitString("payment.pending.doNotClose"),
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.Colors.Text.muted,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            Spacer(Modifier.height(DesignTokens.Spacing.xxl))

            GlassButton(
                text = bayitString("payment.returnToHome"),
                onClick = onNavigateToHome,
                isPrimary = false,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
