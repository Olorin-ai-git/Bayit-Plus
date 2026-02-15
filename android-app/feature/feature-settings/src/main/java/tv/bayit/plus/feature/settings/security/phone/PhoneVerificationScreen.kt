package tv.bayit.plus.feature.settings.security.phone

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.*
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
        GlassTopBar("Phone Verification")
        Column(modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base), verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg)) {
            when (uiState) {
                PhoneVerificationUiState.EnterPhone -> GlassCard(Modifier.fillMaxWidth()) {
                    Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                        Text("Enter Phone Number", fontWeight = FontWeight.Bold)
                        GlassTextField(phone, onPhoneChange, "+1234567890")
                        GlassButton("Send Code", onSendCode, phone.length >= 10, Modifier.fillMaxWidth())
                    }
                }
                PhoneVerificationUiState.SendingCode -> GlassSpinner(SpinnerSize.MEDIUM)
                PhoneVerificationUiState.EnterCode -> GlassCard(Modifier.fillMaxWidth()) {
                    Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                        Text("Enter Verification Code", fontWeight = FontWeight.Bold)
                        GlassTextField(code, onCodeChange, "6-digit code")
                        GlassButton("Verify", onVerify, code.length == 6, Modifier.fillMaxWidth())
                    }
                }
                PhoneVerificationUiState.Verifying -> GlassSpinner(SpinnerSize.MEDIUM)
                PhoneVerificationUiState.Success -> GlassCard(Modifier.fillMaxWidth()) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("✓", fontSize = DesignTokens.FontSize.xxxl, color = DesignTokens.Colors.Semantic.success, fontWeight = FontWeight.Bold)
                        Text("Phone Verified!", fontWeight = FontWeight.Bold)
                    }
                }
                is PhoneVerificationUiState.Error -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(uiState.message, color = DesignTokens.Colors.Semantic.error)
                    GlassButton("Retry", onRetry)
                }
            }
        }
    }
}
