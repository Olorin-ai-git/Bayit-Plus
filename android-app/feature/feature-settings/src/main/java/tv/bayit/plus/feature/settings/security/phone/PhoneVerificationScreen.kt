package tv.bayit.plus.feature.settings.security.phone

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.*
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun PhoneVerificationRoute(onComplete: () -> Unit, onNavigateBack: () -> Unit, modifier: Modifier = Modifier, viewModel: PhoneVerificationViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val phoneNumber by viewModel.phoneNumber.collectAsStateWithLifecycle()
    val code by viewModel.verificationCode.collectAsStateWithLifecycle()
    if (uiState is PhoneVerificationUiState.Success) onComplete()
    PhoneVerificationScreen(uiState, phoneNumber, code, viewModel::updatePhoneNumber, viewModel::updateVerificationCode, viewModel::sendCode, viewModel::verifyCode, onNavigateBack, viewModel::retry, modifier)
}

@Composable
internal fun PhoneVerificationScreen(uiState: PhoneVerificationUiState, phone: String, code: String, onPhoneChange: (String) -> Unit, onCodeChange: (String) -> Unit, onSendCode: () -> Unit, onVerify: () -> Unit, onNavigateBack: () -> Unit, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxSize()) {
        GlassTopBar(bayitString("security.phone.title"))
        Column(modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base), verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg)) {
            when (uiState) {
                PhoneVerificationUiState.EnterPhone -> GlassCard(Modifier.fillMaxWidth()) {
                    Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                        Text(bayitString("security.phone.enterNumber"), fontWeight = FontWeight.Bold)
                        GlassTextField(phone, onPhoneChange, Modifier, placeholder = bayitString("security.phone.phonePlaceholder"))
                        GlassButton(bayitString("security.phone.sendCode"), onSendCode, Modifier.fillMaxWidth(), enabled = phone.length >= 10)
                    }
                }
                PhoneVerificationUiState.SendingCode -> GlassSpinner(Modifier, SpinnerSize.MEDIUM)
                PhoneVerificationUiState.EnterCode -> GlassCard(Modifier.fillMaxWidth()) {
                    Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                        Text(bayitString("security.phone.enterCode"), fontWeight = FontWeight.Bold)
                        GlassTextField(code, onCodeChange, Modifier, placeholder = bayitString("security.phone.codePlaceholder"))
                        GlassButton(bayitString("security.phone.verify"), onVerify, Modifier.fillMaxWidth(), enabled = code.length == 6)
                    }
                }
                PhoneVerificationUiState.Verifying -> GlassSpinner(Modifier, SpinnerSize.MEDIUM)
                PhoneVerificationUiState.Success -> GlassCard(Modifier.fillMaxWidth()) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(bayitString("common.success"), fontSize = DesignTokens.FontSize.xxxl, color = DesignTokens.Colors.Semantic.success, fontWeight = FontWeight.Bold)
                        Text(bayitString("security.phone.verified"), fontWeight = FontWeight.Bold)
                    }
                }
                is PhoneVerificationUiState.Error -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(uiState.message, color = DesignTokens.Colors.Semantic.error)
                    GlassButton(bayitString("common.retry"), onRetry)
                }
            }
        }
    }
}
