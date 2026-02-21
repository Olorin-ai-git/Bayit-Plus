package tv.bayit.plus.feature.auth.tvlogin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun TVLoginStateContent(
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

