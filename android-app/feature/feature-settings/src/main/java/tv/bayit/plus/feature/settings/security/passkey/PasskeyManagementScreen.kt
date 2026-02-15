package tv.bayit.plus.feature.settings.security.passkey

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.*
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun PasskeyManagementRoute(onNavigateBack: () -> Unit, modifier: Modifier = Modifier, viewModel: PasskeyManagementViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    PasskeyManagementScreen(uiState, viewModel::addPasskey, viewModel::deletePasskey, onNavigateBack, viewModel::retry, modifier)
}

@Composable
internal fun PasskeyManagementScreen(uiState: PasskeyManagementUiState, onAddPasskey: () -> Unit, onDeletePasskey: (String) -> Unit, onNavigateBack: () -> Unit, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxSize()) {
        GlassTopBar("Passkey Management")
        when (uiState) {
            PasskeyManagementUiState.Loading -> GlassLoadingIndicator()
            is PasskeyManagementUiState.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                    Text(uiState.message, color = DesignTokens.Colors.Semantic.error)
                    GlassButton("Retry", onRetry)
                }
            }
            is PasskeyManagementUiState.Success -> LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base), verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                item { Spacer(Modifier.height(DesignTokens.Spacing.sm)); GlassButton("Add Passkey", onAddPasskey, Modifier.fillMaxWidth()); Spacer(Modifier.height(DesignTokens.Spacing.sm)) }
                if (uiState.passkeys.isEmpty()) {
                    item { Box(modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.xxl), contentAlignment = Alignment.Center) { Text("No passkeys configured.\nAdd your first passkey!", color = DesignTokens.Colors.Text.muted) } }
                }
                items(uiState.passkeys, key = { it.hashCode() }) { passkey ->
                    GlassCard(Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(passkey.toString(), fontWeight = FontWeight.Medium, color = DesignTokens.Colors.Text.primary)
                                Text("Last used: N/A", fontSize = DesignTokens.FontSize.sm, color = DesignTokens.Colors.Text.muted)
                            }
                            GlassButton("Delete", { onDeletePasskey(passkey.hashCode().toString()) }, Modifier, enabled = false)
                        }
                    }
                }
            }
        }
    }
}
