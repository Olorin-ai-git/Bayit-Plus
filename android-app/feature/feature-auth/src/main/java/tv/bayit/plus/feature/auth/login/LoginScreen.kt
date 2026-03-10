package tv.bayit.plus.feature.auth.login

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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun LoginScreen(
    uiState: LoginUiState,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onLoginClick: () -> Unit,
    onGoogleSignInClick: () -> Unit,
    onRegisterClick: () -> Unit,
    onForgotPasswordClick: () -> Unit,
    onDismissError: () -> Unit,
    showBiometricSignIn: Boolean = false,
    onBiometricSignInClick: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val keyboardController = LocalSoftwareKeyboardController.current
    val isLoading = uiState is LoginUiState.Loading
    val emailValue = when (uiState) {
        is LoginUiState.Input -> uiState.email
        is LoginUiState.Error -> uiState.previousEmail
        else -> ""
    }
    val passwordValue = when (uiState) {
        is LoginUiState.Input -> uiState.password
        is LoginUiState.Error -> uiState.previousPassword
        else -> ""
    }

    Box(modifier = modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = DesignTokens.Spacing.xl),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = bayitString("common.appName"),
                style = MaterialTheme.typography.displayLarge,
                color = DesignTokens.Colors.Primary.base,
            )

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxxl))

            GlassTextField(
                value = emailValue,
                onValueChange = { value ->
                    if (uiState is LoginUiState.Error) onDismissError()
                    onEmailChange(value)
                },
                label = bayitString("login.email"),
                enabled = !isLoading,
            )

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

            GlassTextField(
                value = passwordValue,
                onValueChange = { value ->
                    if (uiState is LoginUiState.Error) onDismissError()
                    onPasswordChange(value)
                },
                label = bayitString("login.password"),
                enabled = !isLoading,
            )

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.base))

            if (uiState is LoginUiState.Error) {
                Text(
                    text = uiState.message,
                    color = DesignTokens.Colors.Semantic.error,
                    style = MaterialTheme.typography.bodySmall,
                )
                Spacer(modifier = Modifier.height(DesignTokens.Spacing.base))
            }

            GlassButton(
                text = bayitString("login.submit"),
                onClick = {
                    keyboardController?.hide()
                    onLoginClick()
                },
                enabled = !isLoading,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

            GlassButton(
                text = bayitString("login.continueWithGoogle"),
                onClick = {
                    keyboardController?.hide()
                    onGoogleSignInClick()
                },
                enabled = !isLoading,
                isPrimary = false,
                modifier = Modifier.fillMaxWidth(),
            )

            if (showBiometricSignIn) {
                Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
                GlassButton(
                    text = bayitString("auth.biometricSignIn"),
                    onClick = onBiometricSignInClick,
                    enabled = !isLoading,
                    isPrimary = false,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))

            TextButton(onClick = onForgotPasswordClick) {
                Text(
                    text = bayitString("login.forgotPassword"),
                    color = DesignTokens.Colors.Text.secondary,
                )
            }

            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

            TextButton(onClick = onRegisterClick) {
                Text(
                    text = bayitString("login.noAccount"),
                    color = DesignTokens.Colors.Primary.light,
                )
            }
        }

        if (isLoading) {
            GlassLoadingIndicator()
        }
    }
}
