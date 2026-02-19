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
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
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
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
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

@Composable
private fun TVLoginStateContent(
    uiState: TVLoginUiState,
    isAuthenticated: Boolean,
    onSignInToTV: () -> Unit,
    onSignIn: () -> Unit,
    onRetry: () -> Unit,
    onDone: () -> Unit,
) {
    when (uiState) {
        is TVLoginUiState.Idle, is TVLoginUiState.Loading -> {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            ) {
                CircularProgressIndicator(
                    color = DesignTokens.Colors.Primary.p400,
                    modifier = Modifier.size(36.dp),
                )
                Text(bayitString("tvLogin.verifying"), color = DesignTokens.Colors.Text.secondary)
            }
        }

        is TVLoginUiState.CompanionConnected -> {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
                ) {
                    PulsingIcon(Icons.Default.CheckCircle, DesignTokens.Colors.Semantic.success, 64.dp)
                    Text(
                        bayitString("tvLogin.connected"),
                        style = MaterialTheme.typography.titleLarge,
                        color = DesignTokens.Colors.Text.primary,
                        textAlign = TextAlign.Center,
                    )
                    if (isAuthenticated) {
                        GlassButton(
                            text = bayitString("tvLogin.signInToTV"),
                            onClick = onSignInToTV,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    } else {
                        Text(
                            bayitString("tvLogin.pleaseSignIn"),
                            color = DesignTokens.Colors.Text.secondary,
                            textAlign = TextAlign.Center,
                        )
                        GlassButton(bayitString("tvLogin.signInButton"), onSignIn, Modifier.fillMaxWidth())
                    }
                }
            }
        }

        is TVLoginUiState.Authenticating -> {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            ) {
                CircularProgressIndicator(
                    color = DesignTokens.Colors.Primary.p400,
                    modifier = Modifier.size(48.dp),
                    strokeWidth = 4.dp,
                )
                Text(
                    bayitString("tvLogin.authenticating"),
                    style = MaterialTheme.typography.titleMedium,
                    color = DesignTokens.Colors.Text.primary,
                    textAlign = TextAlign.Center,
                )
                Text(bayitString("tvLogin.almostThere"), color = DesignTokens.Colors.Text.secondary)
            }
        }

        is TVLoginUiState.Authenticated -> {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
            ) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    modifier = Modifier.size(80.dp),
                    tint = DesignTokens.Colors.Semantic.success,
                )
                Text(
                    bayitString("tvLogin.success"),
                    style = MaterialTheme.typography.headlineMedium,
                    color = DesignTokens.Colors.Text.primary,
                    textAlign = TextAlign.Center,
                )
                Text(
                    bayitString("tvLogin.tvSignedIn"),
                    color = DesignTokens.Colors.Text.secondary,
                    textAlign = TextAlign.Center,
                )
                GlassButton(bayitString("common.done"), onDone, Modifier.fillMaxWidth())
            }
        }

        is TVLoginUiState.Failed -> {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = DesignTokens.Colors.Semantic.error,
                    )
                    Text(
                        bayitString("tvLogin.error"),
                        style = MaterialTheme.typography.titleLarge,
                        color = DesignTokens.Colors.Text.primary,
                        textAlign = TextAlign.Center,
                    )
                    Text(uiState.message, color = DesignTokens.Colors.Text.secondary, textAlign = TextAlign.Center)
                    GlassButton(bayitString("common.tryAgain"), onRetry, Modifier.fillMaxWidth())
                }
            }
        }

        is TVLoginUiState.Expired -> {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
                ) {
                    Icon(
                        imageVector = Icons.Default.Schedule,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = DesignTokens.Colors.Semantic.warning,
                    )
                    Text(
                        bayitString("tvLogin.expired"),
                        style = MaterialTheme.typography.titleLarge,
                        color = DesignTokens.Colors.Text.primary,
                        textAlign = TextAlign.Center,
                    )
                    Text(
                        bayitString("tvLogin.expiredMessage"),
                        color = DesignTokens.Colors.Text.secondary,
                        textAlign = TextAlign.Center,
                    )
                    GlassButton(bayitString("tvLogin.goToHome"), onDone, Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun PulsingIcon(icon: ImageVector, tint: Color, size: Dp) {
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
