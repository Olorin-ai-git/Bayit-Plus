package tv.bayit.plus.feature.auth.tvlogin

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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.auth.AuthState
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun TVLoginRoute(
    sessionId: String,
    token: String,
    onNavigateToHome: () -> Unit,
    onNavigateToLogin: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TVLoginViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val authState by viewModel.authState.collectAsStateWithLifecycle()

    LaunchedEffect(sessionId, token) { viewModel.initiate(sessionId, token) }
    LaunchedEffect(uiState) { if (uiState is TVLoginUiState.Authenticated) onNavigateToHome() }

    TVLoginScreen(
        uiState = uiState,
        isAuthenticated = authState is AuthState.Authenticated,
        onSignInToTV = { viewModel.completeAuthentication(sessionId) },
        onSignIn = onNavigateToLogin,
        onRetry = { viewModel.retry(sessionId, token) },
        onDone = onNavigateToHome,
        modifier = modifier,
    )
}

@Composable
internal fun TVLoginScreen(
    uiState: TVLoginUiState,
    isAuthenticated: Boolean,
    onSignInToTV: () -> Unit,
    onSignIn: () -> Unit,
    onRetry: () -> Unit,
    onDone: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(DesignTokens.Spacing.xl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
        ) {
            Spacer(Modifier.height(DesignTokens.Spacing.xxxl))

            Text(
                text = "Sign In to TV",
                style = MaterialTheme.typography.headlineLarge,
                color = DesignTokens.Colors.Text.primary,
                textAlign = TextAlign.Center,
            )
            Text(
                text = "Complete authentication for your TV device",
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(DesignTokens.Spacing.xl))

            when (uiState) {
                is TVLoginUiState.Idle, is TVLoginUiState.Loading -> {
                    CircularProgressIndicator(color = DesignTokens.Colors.Primary.base)
                    Text("Verifying session...", color = DesignTokens.Colors.Text.secondary)
                }
                is TVLoginUiState.CompanionConnected, is TVLoginUiState.Authenticating -> {
                    val isAuthenticating = uiState is TVLoginUiState.Authenticating
                    Text(
                        text = "Phone Connected",
                        style = MaterialTheme.typography.headlineSmall,
                        color = DesignTokens.Colors.Text.primary,
                        textAlign = TextAlign.Center,
                    )
                    if (isAuthenticated) {
                        GlassButton(
                            text = if (isAuthenticating) "Signing In..." else "Sign In to TV",
                            onClick = onSignInToTV,
                            enabled = !isAuthenticating,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    } else {
                        Text(
                            text = "Please sign in to complete TV authentication",
                            color = DesignTokens.Colors.Text.secondary,
                            textAlign = TextAlign.Center,
                        )
                        GlassButton("Sign In", onSignIn, Modifier.fillMaxWidth())
                    }
                }
                is TVLoginUiState.Authenticated -> {
                    Text(
                        text = "Successfully signed in to TV",
                        style = MaterialTheme.typography.headlineSmall,
                        color = DesignTokens.Colors.Semantic.success,
                        textAlign = TextAlign.Center,
                    )
                    GlassButton("Done", onDone, Modifier.fillMaxWidth())
                }
                is TVLoginUiState.Failed -> {
                    Text(
                        text = "Something went wrong",
                        style = MaterialTheme.typography.headlineSmall,
                        color = DesignTokens.Colors.Semantic.error,
                        textAlign = TextAlign.Center,
                    )
                    Text(uiState.message, color = DesignTokens.Colors.Text.secondary, textAlign = TextAlign.Center)
                    GlassButton("Try Again", onRetry, Modifier.fillMaxWidth())
                }
                is TVLoginUiState.Expired -> {
                    Text(
                        text = "Session Expired",
                        style = MaterialTheme.typography.headlineSmall,
                        color = DesignTokens.Colors.Semantic.warning,
                        textAlign = TextAlign.Center,
                    )
                    Text(
                        text = "This QR code has expired. Please generate a new one on your TV.",
                        color = DesignTokens.Colors.Text.secondary,
                        textAlign = TextAlign.Center,
                    )
                    GlassButton("Go to Home", onDone, Modifier.fillMaxWidth())
                }
            }
        }

        if (uiState is TVLoginUiState.Authenticating) {
            GlassLoadingIndicator()
        }
    }
}
