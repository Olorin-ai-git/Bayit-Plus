package tv.bayit.plus.feature.auth.tvlogin

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.auth.AuthState
import tv.bayit.plus.designsystem.i18n.bayitString
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
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(DesignTokens.Spacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
    ) {
        Spacer(Modifier.height(DesignTokens.Spacing.xxxl))
        TVLoginHeader()
        Spacer(Modifier.height(DesignTokens.Spacing.lg))
        TVLoginStateContent(uiState, isAuthenticated, onSignInToTV, onSignIn, onRetry, onDone)
        Spacer(Modifier.height(DesignTokens.Spacing.xxxl))
    }
}

@Composable
internal fun PulsingIcon(icon: ImageVector, tint: Color, size: Dp) {
    val transition = rememberInfiniteTransition(label = "pulse")
    val alpha by transition.animateFloat(
        initialValue = 1f,
        targetValue = 0.45f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "alpha",
    )
    Icon(imageVector = icon, contentDescription = null, modifier = Modifier.size(size).alpha(alpha), tint = tint)
}

@Composable
private fun TVLoginHeader() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        Icon(
            imageVector = Icons.Default.Tv,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = DesignTokens.Colors.Primary.p400,
        )
        Text(
            text = bayitString("tvLogin.header"),
            style = MaterialTheme.typography.headlineMedium,
            color = DesignTokens.Colors.Text.primary,
            textAlign = TextAlign.Center,
        )
        Text(
            text = bayitString("tvLogin.subtitle"),
            style = MaterialTheme.typography.bodyMedium,
            color = DesignTokens.Colors.Text.secondary,
            textAlign = TextAlign.Center,
        )
    }
}
