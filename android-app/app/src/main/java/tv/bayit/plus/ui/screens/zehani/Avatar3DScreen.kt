package tv.bayit.plus.ui.screens.zehani

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Download
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.data.model.zehani.MeshStatus
import tv.bayit.plus.ui.viewmodel.zehani.Avatar3DViewModel

@Composable
fun Avatar3DScreen(
    avatarId: String,
    onNavigateBack: () -> Unit,
    viewModel: Avatar3DViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(avatarId) {
        viewModel.loadAvatar(avatarId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("3D Avatar") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    if (uiState.glbUrl != null) {
                        IconButton(onClick = { /* Download GLB */ }) {
                            Icon(Icons.Default.Download, "Download")
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (uiState.error != null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = uiState.error ?: "Unknown error",
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(32.dp)
                )
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                // 3D Viewer
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(16.dp)
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        when (uiState.mesh?.status) {
                            MeshStatus.READY -> {
                                if (uiState.glbUrl != null) {
                                    // TODO: Filament 3D viewer component
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally
                                    ) {
                                        Text(
                                            "🎭",
                                            style = MaterialTheme.typography.displayLarge
                                        )
                                        Spacer(modifier = Modifier.height(16.dp))
                                        Text(
                                            "3D Avatar Viewer",
                                            style = MaterialTheme.typography.titleLarge,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            "Filament renderer integration here",
                                            textAlign = TextAlign.Center,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                        )
                                    }
                                } else {
                                    CircularProgressIndicator()
                                }
                            }
                            MeshStatus.GENERATING, MeshStatus.RIGGING, MeshStatus.PENDING -> {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    CircularProgressIndicator()
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Text(
                                        "Generating avatar mesh...",
                                        style = MaterialTheme.typography.titleMedium
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        "Status: ${uiState.mesh?.status?.name}",
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                    )
                                }
                            }
                            MeshStatus.FAILED -> {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text("❌", style = MaterialTheme.typography.displayLarge)
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Text(
                                        "Mesh Generation Failed",
                                        style = MaterialTheme.typography.titleLarge,
                                        color = MaterialTheme.colorScheme.error
                                    )
                                    uiState.mesh?.errorMessage?.let { error ->
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(
                                            error,
                                            textAlign = TextAlign.Center,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                        )
                                    }
                                }
                            }
                            else -> {
                                Text("No mesh data")
                            }
                        }
                    }
                }

                // Info Panel
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    uiState.mesh?.let { mesh ->
                        Card(
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Text(
                                    "Avatar Details",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(modifier = Modifier.height(12.dp))

                                InfoRow("Status", mesh.status.name)
                                InfoRow("Source", mesh.source.name)
                                mesh.blendShapes.takeIf { it.isNotEmpty() }?.let {
                                    InfoRow("Blend Shapes", "${it.size}")
                                }
                                mesh.vertexCount?.let {
                                    InfoRow("Vertices", it.toString())
                                }
                                mesh.boneCount?.let {
                                    InfoRow("Bones", it.toString())
                                }
                                InfoRow("Credits Charged", mesh.creditsCharged.toString())
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )
        Text(
            value,
            fontWeight = FontWeight.Medium
        )
    }
}
