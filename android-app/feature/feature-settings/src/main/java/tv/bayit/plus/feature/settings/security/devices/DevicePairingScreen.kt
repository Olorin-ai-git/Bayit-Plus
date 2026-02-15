package tv.bayit.plus.feature.settings.security.devices

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
fun DevicePairingRoute(onNavigateBack: () -> Unit, modifier: Modifier = Modifier, viewModel: DevicePairingViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    DevicePairingScreen(uiState, viewModel::generatePairingCode, viewModel::removeDevice, onNavigateBack, viewModel::retry, modifier)
}

@Composable
internal fun DevicePairingScreen(uiState: DevicePairingUiState, onGenerateCode: () -> Unit, onRemoveDevice: (String) -> Unit, onNavigateBack: () -> Unit, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier.fillMaxSize()) {
        GlassTopBar("Device Pairing")
        when (uiState) {
            DevicePairingUiState.Loading -> GlassLoadingIndicator()
            is DevicePairingUiState.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                    Text(uiState.message, color = DesignTokens.Colors.Semantic.error)
                    GlassButton("Retry", onRetry)
                }
            }
            is DevicePairingUiState.PairingCodeReady -> Column(modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                GlassCard(Modifier.fillMaxWidth()) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                        Text("Pairing Code", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        Text(uiState.code, style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Bold, color = DesignTokens.Colors.Primary.light)
                        Text("Enter this code on your TV device", color = DesignTokens.Colors.Text.muted)
                    }
                }
            }
            is DevicePairingUiState.Success -> LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base), verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                item { Spacer(Modifier.height(DesignTokens.Spacing.sm)); GlassButton("Pair New Device", onGenerateCode, modifier = Modifier.fillMaxWidth()); Spacer(Modifier.height(DesignTokens.Spacing.sm)) }
                if (uiState.devices.isEmpty()) {
                    item { Box(modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.xxl), contentAlignment = Alignment.Center) { Text("No devices paired.\nPair your first device!", color = DesignTokens.Colors.Text.muted) } }
                }
                items(uiState.devices, key = { it.hashCode() }) { device ->
                    GlassCard(Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(device.toString(), fontWeight = FontWeight.Medium, color = DesignTokens.Colors.Text.primary)
                                Text("Last active: N/A", fontSize = DesignTokens.FontSize.sm, color = DesignTokens.Colors.Text.muted)
                            }
                            GlassButton("Remove", { onRemoveDevice(device.hashCode().toString()) }, false)
                        }
                    }
                }
            }
        }
    }
}
