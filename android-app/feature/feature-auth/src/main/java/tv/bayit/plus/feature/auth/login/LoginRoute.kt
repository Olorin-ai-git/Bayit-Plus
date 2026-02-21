package tv.bayit.plus.feature.auth.login

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun LoginRoute(
    onNavigateToHome: () -> Unit,
    onNavigateToRegister: () -> Unit,
    onNavigateToForgotPassword: () -> Unit,
    onRequestGoogleSignIn: ((String) -> Unit) -> Unit,
    onRequestBiometricSignIn: ((Boolean) -> Unit) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(uiState) {
        val success = uiState as? LoginUiState.Success ?: return@LaunchedEffect
        if (!success.offerBiometricEnrollment) onNavigateToHome()
    }

    if (uiState is LoginUiState.Success && (uiState as LoginUiState.Success).offerBiometricEnrollment) {
        BiometricEnrollmentDialog(
            onEnable = { viewModel.enableBiometricSignIn(); onNavigateToHome() },
            onDismiss = onNavigateToHome,
        )
    } else {
        LoginScreen(
            uiState = uiState,
            onEmailChange = viewModel::updateEmail,
            onPasswordChange = viewModel::updatePassword,
            onLoginClick = viewModel::loginWithEmail,
            onGoogleSignInClick = { onRequestGoogleSignIn(viewModel::loginWithGoogle) },
            onRegisterClick = onNavigateToRegister,
            onForgotPasswordClick = onNavigateToForgotPassword,
            onDismissError = viewModel::dismissError,
            showBiometricSignIn = (uiState as? LoginUiState.Input)?.showBiometricSignIn ?: false,
            onBiometricSignInClick = { onRequestBiometricSignIn(viewModel::onBiometricSignInResult) },
            modifier = modifier,
        )
    }
}
