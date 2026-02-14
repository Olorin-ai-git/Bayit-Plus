package tv.bayit.plus.feature.settings.security.mfa

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.*
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun MFASetupRoute(onComplete: () -> Unit, onNavigateBack: () -> Unit, modifier: Modifier = Modifier, viewModel: MFASetupViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val verificationCode by viewModel.verificationCode.collectAsStateWithLifecycle()
    if (uiState is MFASetupUiState.Success) onComplete()
    MFASetupScreen(uiState, verificationCode, viewModel::updateVerificationCode, viewModel::verifyAndEnable, onNavigateBack, viewModel::retry, modifier)
}

@Composable
internal fun MFASetupScreen(uiState: MFASetupUiState, verificationCode: String, onCodeChange: (String) -> Unit, onVerify: () -> Unit, onNavigateBack: () -> Unit, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxSize()) {
        GlassTopBar("2FA Setup")
        when (uiState) {
            MFASetupUiState.Loading -> GlassLoadingIndicator()
            is MFASetupUiState.Error -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                Column(Alignment.CenterHorizontally, Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                    Text(uiState.message, color = DesignTokens.Colors.Semantic.error)
                    GlassButton("Retry", onRetry)
                }
            }
            is MFASetupUiState.QRCodeReady -> Column(Modifier.fillMaxSize().padding(DesignTokens.Spacing.base), Arrangement.spacedBy(DesignTokens.Spacing.lg)) {
                GlassCard(Modifier.fillMaxWidth()) {
                    Column(Alignment.CenterHorizontally, Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                        Text("Scan QR Code", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = DesignTokens.Colors.Text.primary)
                        Text("Scan this QR code with your authenticator app", style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary, textAlign = TextAlign.Center)
                        Box(Modifier.size(DesignTokens.Spacing.xxxl * 4).padding(DesignTokens.Spacing.md)) {
                            Text("QR", Modifier.align(Alignment.Center))
                        }
                        Text(uiState.secret, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.muted)
                    }
                }
                GlassCard(Modifier.fillMaxWidth()) {
                    Column(Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                        Text("Enter Verification Code", fontWeight = FontWeight.SemiBold)
                        GlassTextField(verificationCode, onCodeChange, "6-digit code")
                        uiState.error?.let { Text(it, color = DesignTokens.Colors.Semantic.error, fontSize = DesignTokens.FontSize.sm) }
                    }
                }
                if (uiState.isVerifying) GlassSpinner(SpinnerSize.MEDIUM) else GlassButton("Enable 2FA", onVerify, verificationCode.length == 6, Modifier.fillMaxWidth())
            }
            MFASetupUiState.Success -> GlassCard(Modifier.fillMaxWidth().padding(DesignTokens.Spacing.base)) {
                Column(Alignment.CenterHorizontally) {
                    Text("✓", fontSize = DesignTokens.FontSize.xxxl, color = DesignTokens.Colors.Semantic.success, fontWeight = FontWeight.Bold)
                    Text("2FA Enabled!", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
