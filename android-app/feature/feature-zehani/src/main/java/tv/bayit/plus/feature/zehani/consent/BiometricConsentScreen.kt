package tv.bayit.plus.feature.zehani.consent

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.zehani.ConsentStatus
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun BiometricConsentRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: BiometricConsentViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val pinInput by viewModel.pinInput.collectAsStateWithLifecycle()

    BiometricConsentScreen(
        uiState = uiState,
        pinInput = pinInput,
        onPinChange = viewModel::updatePin,
        onGrantConsent = viewModel::grantConsent,
        onRetry = viewModel::retry,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun BiometricConsentScreen(
    uiState: ConsentUiState,
    pinInput: String,
    onPinChange: (String) -> Unit,
    onGrantConsent: (String) -> Unit,
    onRetry: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Biometric Consent")
        when (uiState) {
            is ConsentUiState.Loading -> GlassLoadingIndicator()
            is ConsentUiState.Error -> ErrorContent(message = uiState.message, onRetry = onRetry)
            is ConsentUiState.Success -> ConsentContent(
                consents = uiState.consents,
                pinInput = pinInput,
                onPinChange = onPinChange,
                onGrantConsent = onGrantConsent,
            )
        }
    }
}

@Composable
private fun ConsentContent(
    consents: List<ConsentStatus>,
    pinInput: String,
    onPinChange: (String) -> Unit,
    onGrantConsent: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.sm)) }

        item {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                    Text(
                        text = "Family PIN",
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary,
                        fontWeight = FontWeight.SemiBold,
                    )
                    GlassTextField(
                        value = pinInput,
                        onValueChange = onPinChange,
                        placeholder = "Enter family PIN...",
                        singleLine = true,
                    )
                }
            }
        }

        item {
            Text(
                text = "Consent Types",
                style = MaterialTheme.typography.titleLarge,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
            )
        }

        items(CONSENT_TYPES, key = { it.first }) { (typeKey, typeLabel) ->
            val existingConsent = consents.find { it.consentType == typeKey }
            val isActive = existingConsent?.active == true

            ConsentTypeCard(
                label = typeLabel,
                isActive = isActive,
                onGrant = { onGrantConsent(typeKey) },
            )
        }

        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun ConsentTypeCard(
    label: String,
    isActive: Boolean,
    onGrant: () -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    text = if (isActive) "Active" else "Not granted",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isActive) DesignTokens.Colors.Semantic.success
                    else DesignTokens.Colors.Text.muted,
                )
            }
            if (!isActive) {
                GlassButton(text = "Grant", onClick = onGrant)
            } else {
                Text(
                    text = "Granted",
                    color = DesignTokens.Colors.Semantic.success,
                    fontWeight = FontWeight.Bold,
                    fontSize = DesignTokens.FontSize.sm,
                )
            }
        }
    }
}

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(text = message, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
