package tv.bayit.plus.ui.screens.zehani

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.ui.viewmodel.zehani.BiometricConsentViewModel

data class ConsentTypeInfo(
    val type: String,
    val icon: String,
    val title: String,
    val description: String
)

@Composable
fun BiometricConsentScreen(
    profileId: String,
    onNavigateBack: () -> Unit,
    viewModel: BiometricConsentViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showPinDialog by remember { mutableStateOf(false) }
    var selectedConsentType by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(profileId) {
        viewModel.loadConsentStatus(profileId)
    }

    val consentTypes = listOf(
        ConsentTypeInfo(
            "mesh_generation",
            "🎭",
            "3D Mesh Generation",
            "Create 3D avatar from face scan"
        ),
        ConsentTypeInfo(
            "voice_v2v",
            "🎤",
            "Voice Transformation",
            "Voice-to-voice Hebrew practice"
        ),
        ConsentTypeInfo(
            "latent_features",
            "🧠",
            "AI Features",
            "Advanced AI personalization"
        )
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Biometric Consent") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Warning Card
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text("⚠️", style = MaterialTheme.typography.headlineSmall)
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(
                            "Important",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "Parental consent required for all biometric features. PIN protected.",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Consent Type Cards
            consentTypes.forEach { consentType ->
                val hasConsent = viewModel.hasConsent(consentType.type)

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = if (hasConsent) {
                        CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.primaryContainer
                        )
                    } else {
                        CardDefaults.cardColors()
                    }
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp)
                    ) {
                        Row {
                            Text(
                                consentType.icon,
                                style = MaterialTheme.typography.displaySmall
                            )
                            Spacer(modifier = Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    consentType.title,
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    consentType.description,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        if (hasConsent) {
                            Text(
                                "✓ Active",
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.SemiBold
                            )
                        } else {
                            Button(
                                onClick = {
                                    selectedConsentType = consentType.type
                                    showPinDialog = true
                                },
                                enabled = !uiState.isGranting
                            ) {
                                Text("Grant Consent")
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
            }
        }
    }

    // PIN Dialog
    if (showPinDialog && selectedConsentType != null) {
        var pin by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showPinDialog = false },
            title = { Text("Enter PIN") },
            text = {
                Column {
                    Text("Enter your 6-digit PIN to grant consent:")
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = pin,
                        onValueChange = { if (it.length <= 6) pin = it },
                        label = { Text("PIN") },
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.grantConsent(profileId, selectedConsentType!!, pin)
                        showPinDialog = false
                        pin = ""
                        selectedConsentType = null
                    },
                    enabled = pin.length == 6 && !uiState.isGranting
                ) {
                    Text("Confirm")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPinDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Error Snackbar
    uiState.error?.let { error ->
        LaunchedEffect(error) {
            // Show snackbar
        }
    }
}
