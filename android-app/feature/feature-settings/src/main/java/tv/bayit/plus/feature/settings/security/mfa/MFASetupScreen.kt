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
import tv.bayit.plus.designsystem.i18n.bayitString
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
        GlassTopBar(bayitString("security.mfa.title"))
        when (uiState) {
            MFASetupUiState.Loading -> GlassLoadingIndicator()
            is MFASetupUiState.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                    Text(uiState.message, color = DesignTokens.Colors.Semantic.error)
                    GlassButton(bayitString("common.retry"), onRetry)
                }
            }
            is MFASetupUiState.QRCodeReady -> Column(modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base), verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg)) {
                GlassCard(Modifier.fillMaxWidth()) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                        Text(bayitString("security.mfa.scanQrCode"), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = DesignTokens.Colors.Text.primary)
                        Text(bayitString("security.mfa.scanQrDescription"), style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary, textAlign = TextAlign.Center)
                        Box(Modifier.size(DesignTokens.Spacing.xxxl * 4).padding(DesignTokens.Spacing.md)) {
                            Text(bayitString("security.mfa.qrLabel"), Modifier.align(Alignment.Center))
                        }
                        Text(uiState.secret, style = MaterialTheme.typography.bodySmall, color = DesignTokens.Colors.Text.muted)
                    }
                }
                GlassCard(Modifier.fillMaxWidth()) {
                    Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                        Text(bayitString("security.mfa.enterCode"), fontWeight = FontWeight.SemiBold)
                        GlassTextField(verificationCode, onCodeChange, Modifier, placeholder = bayitString("security.mfa.codePlaceholder"))
                        uiState.error?.let { Text(it, color = DesignTokens.Colors.Semantic.error, fontSize = DesignTokens.FontSize.sm) }
                    }
                }
                if (uiState.isVerifying) GlassSpinner(Modifier, SpinnerSize.MEDIUM) else GlassButton(bayitString("security.mfa.enable"), onVerify, Modifier.fillMaxWidth(), enabled = verificationCode.length == 6)
            }
            MFASetupUiState.Success -> GlassCard(Modifier.fillMaxWidth().padding(DesignTokens.Spacing.base)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(bayitString("common.success"), fontSize = DesignTokens.FontSize.xxxl, color = DesignTokens.Colors.Semantic.success, fontWeight = FontWeight.Bold)
                    Text(bayitString("security.mfa.verified"), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
