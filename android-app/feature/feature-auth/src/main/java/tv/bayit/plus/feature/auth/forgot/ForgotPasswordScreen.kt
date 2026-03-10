package tv.bayit.plus.feature.auth.forgot

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun ForgotPasswordRoute(
    onNavigateBack: () -> Unit,
    onResetSent: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ForgotPasswordViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(uiState) {
        if (uiState is ForgotPasswordUiState.Success) {
            onResetSent()
        }
    }

    ForgotPasswordScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onEmailChange = viewModel::updateEmail,
        onSendResetClick = viewModel::sendResetLink,
        onDismissError = viewModel::dismissError,
        modifier = modifier,
    )
}

@Composable
internal fun ForgotPasswordScreen(
    uiState: ForgotPasswordUiState,
    onNavigateBack: () -> Unit,
    onEmailChange: (String) -> Unit,
    onSendResetClick: () -> Unit,
    onDismissError: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val keyboardController = LocalSoftwareKeyboardController.current
    val isLoading = uiState is ForgotPasswordUiState.Loading
    val emailValue = when (uiState) {
        is ForgotPasswordUiState.Idle -> uiState.email
        is ForgotPasswordUiState.Error -> uiState.previousEmail
        else -> ""
    }

    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("auth.forgot.title"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = bayitString("common.back"),
                        tint = DesignTokens.Colors.Text.primary,
                    )
                }
            },
        )

        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = DesignTokens.Spacing.xl),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = bayitString("auth.forgot.heading"),
                    style = MaterialTheme.typography.headlineMedium,
                    color = DesignTokens.Colors.Text.primary,
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

                Text(
                    text = bayitString("auth.forgot.instructions"),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary,
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxl))

                GlassTextField(
                    value = emailValue,
                    onValueChange = { value ->
                        if (uiState is ForgotPasswordUiState.Error) onDismissError()
                        onEmailChange(value)
                    },
                    label = bayitString("login.email"),
                    enabled = !isLoading,
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.base))

                if (uiState is ForgotPasswordUiState.Error) {
                    Text(
                        text = uiState.message,
                        color = DesignTokens.Colors.Semantic.error,
                        style = MaterialTheme.typography.bodySmall,
                    )
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.base))
                }

                if (uiState is ForgotPasswordUiState.Success) {
                    SuccessConfirmation()
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))
                }

                GlassButton(
                    text = bayitString("auth.forgot.sendLink"),
                    onClick = {
                        keyboardController?.hide()
                        onSendResetClick()
                    },
                    enabled = !isLoading && uiState !is ForgotPasswordUiState.Success,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            if (isLoading) {
                GlassLoadingIndicator()
            }
        }
    }
}

@Composable
private fun SuccessConfirmation() {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(DesignTokens.Spacing.md)) {
            Text(
                text = bayitString("auth.forgot.successTitle"),
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Semantic.success,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = bayitString("auth.forgot.successMessage"),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}
