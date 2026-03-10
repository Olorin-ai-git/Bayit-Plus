package tv.bayit.plus.feature.auth.subscription

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.core.data.billing.SubscriptionProduct
import tv.bayit.plus.core.data.billing.billingPeriodLabel
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

/**
 * Card displaying a Google Play subscription product with price and period.
 */
@Composable
internal fun SubscriptionProductCard(
    product: SubscriptionProduct,
    isSelected: Boolean,
    onSelect: () -> Unit,
) {
    val planLabel = "${product.billingPeriodLabel()}, ${product.formattedPrice}"
    GlassCard(
        modifier = Modifier.fillMaxWidth()
            .semantics { contentDescription = planLabel }
            .clickable(onClick = onSelect),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = product.billingPeriodLabel(),
                    style = MaterialTheme.typography.titleMedium,
                    color = if (isSelected) DesignTokens.Colors.Primary.light
                    else DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(DesignTokens.Spacing.xs))
                Text(
                    text = product.formattedPrice,
                    style = MaterialTheme.typography.headlineSmall,
                    color = if (isSelected) DesignTokens.Colors.Primary.base
                    else DesignTokens.Colors.Text.secondary,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = product.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = DesignTokens.Colors.Text.muted,
                )
            }
            RadioButton(
                selected = isSelected,
                onClick = onSelect,
                colors = RadioButtonDefaults.colors(
                    selectedColor = DesignTokens.Colors.Primary.base,
                ),
            )
        }
    }
}

@Composable
internal fun SubscribeCheckoutFooter(
    checkoutError: String?,
    isProcessingCheckout: Boolean,
    selectedPlanId: String?,
    onStartCheckout: () -> Unit,
) {
    checkoutError?.let {
        Text(
            text = it,
            color = DesignTokens.Colors.Semantic.error,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
    if (isProcessingCheckout) {
        GlassSpinner(size = SpinnerSize.MEDIUM, modifier = Modifier.padding(DesignTokens.Spacing.lg))
    } else {
        GlassButton(
            text = bayitString("subscription.subscribe"),
            onClick = onStartCheckout,
            enabled = selectedPlanId != null,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
internal fun SubscribeErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                color = DesignTokens.Colors.Semantic.error,
                style = MaterialTheme.typography.bodyLarge,
            )
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
