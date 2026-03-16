package tv.bayit.plus.feature.auth.register

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassProgressBar
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun RegisterRoute(
    onNavigateToProfileSelection: () -> Unit,
    onNavigateToLogin: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: RegisterViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(uiState) {
        if (uiState is RegisterUiState.Success) onNavigateToProfileSelection()
    }
    RegisterScreen(
        uiState = uiState,
        onEmailChange = viewModel::updateEmail,
        onPasswordChange = viewModel::updatePassword,
        onConfirmPasswordChange = viewModel::updateConfirmPassword,
        onRegisterClick = viewModel::register,
        onLoginClick = onNavigateToLogin,
        onDismissError = viewModel::dismissError,
        modifier = modifier,
    )
}

@Composable
internal fun RegisterScreen(
    uiState: RegisterUiState,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onRegisterClick: () -> Unit,
    onLoginClick: () -> Unit,
    onDismissError: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val keyboardController = LocalSoftwareKeyboardController.current
    val isLoading = uiState is RegisterUiState.Loading
    val input = when (uiState) {
        is RegisterUiState.Input -> uiState
        is RegisterUiState.Error -> uiState.previousInput
        else -> null
    }

    Box(modifier = modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())
                .padding(horizontal = DesignTokens.Spacing.xl),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(bayitString("auth.register.createAccount"), style = MaterialTheme.typography.headlineLarge, color = DesignTokens.Colors.Primary.base)
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxxl))

            GlassTextField(
                value = input?.email.orEmpty(),
                onValueChange = { if (uiState is RegisterUiState.Error) onDismissError(); onEmailChange(it) },
                label = bayitString("auth.register.email"), enabled = !isLoading,
            )
            FieldErrorText(input?.fieldError, "email")
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

            GlassTextField(
                value = input?.password.orEmpty(),
                onValueChange = { if (uiState is RegisterUiState.Error) onDismissError(); onPasswordChange(it) },
                label = bayitString("auth.register.password"), enabled = !isLoading,
                isPassword = true,
            )
            FieldErrorText(input?.fieldError, "password")
            if ((input?.password?.length ?: 0) > 0) {
                Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
                PasswordStrengthIndicator(strength = input?.passwordStrength ?: PasswordStrength.WEAK)
            }
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

            GlassTextField(
                value = input?.confirmPassword.orEmpty(),
                onValueChange = { if (uiState is RegisterUiState.Error) onDismissError(); onConfirmPasswordChange(it) },
                label = bayitString("auth.register.confirmPassword"), enabled = !isLoading,
                isPassword = true,
            )
            FieldErrorText(input?.fieldError, "confirmPassword")
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.base))

            if (uiState is RegisterUiState.Error) {
                Text(uiState.message, color = DesignTokens.Colors.Semantic.error, style = MaterialTheme.typography.bodySmall)
                Spacer(modifier = Modifier.height(DesignTokens.Spacing.base))
            }

            GlassButton(
                text = bayitString("auth.register.register"),
                onClick = { keyboardController?.hide(); onRegisterClick() },
                enabled = !isLoading, modifier = Modifier.fillMaxWidth(),
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))

            TextButton(onClick = onLoginClick) {
                Text(bayitString("auth.register.alreadyHaveAccount"), color = DesignTokens.Colors.Primary.light)
            }
        }
        if (isLoading) GlassLoadingIndicator()
    }
}

@Composable
private fun FieldErrorText(fieldError: FieldError?, targetField: String) {
    if (fieldError != null && fieldError.field == targetField) {
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
        Text(fieldError.message, color = DesignTokens.Colors.Semantic.error, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun PasswordStrengthIndicator(strength: PasswordStrength, modifier: Modifier = Modifier) {
    val progress = when (strength) {
        PasswordStrength.WEAK -> 0.33f
        PasswordStrength.MEDIUM -> 0.66f
        PasswordStrength.STRONG -> 1f
    }
    val label = when (strength) {
        PasswordStrength.WEAK -> bayitString("auth.register.passwordStrength.weak")
        PasswordStrength.MEDIUM -> bayitString("auth.register.passwordStrength.medium")
        PasswordStrength.STRONG -> bayitString("auth.register.passwordStrength.strong")
    }
    val color = when (strength) {
        PasswordStrength.WEAK -> DesignTokens.Colors.Semantic.error
        PasswordStrength.MEDIUM -> DesignTokens.Colors.Semantic.warning
        PasswordStrength.STRONG -> DesignTokens.Colors.Semantic.success
    }
    Row(modifier = modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        GlassProgressBar(progress = progress, modifier = Modifier.weight(1f))
        Spacer(modifier = Modifier.padding(start = DesignTokens.Spacing.sm))
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = color)
    }
}
