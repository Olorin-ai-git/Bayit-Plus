package tv.bayit.plus.ui.screens.zehani

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.data.model.zehani.V2VSession
import tv.bayit.plus.ui.viewmodel.zehani.V2VPracticeViewModel

@Composable
fun V2VPracticeScreen(
    profileId: String,
    avatarId: String,
    onNavigateBack: () -> Unit,
    viewModel: V2VPracticeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var targetPhrase by remember { mutableStateOf("") }

    LaunchedEffect(profileId) {
        viewModel.loadSessions(profileId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Voice Practice") },
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
        ) {
            // Practice Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "🎤 Voice Practice",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = targetPhrase,
                        onValueChange = { targetPhrase = it },
                        label = { Text("Hebrew phrase to practice") },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("שלום עולם") }
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = { /* Record audio */ },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = targetPhrase.isNotBlank() && !uiState.isTransforming
                    ) {
                        Icon(Icons.Default.Mic, null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            if (uiState.isTransforming) "Processing..." else "Record & Practice"
                        )
                    }

                    // Latest Result
                    uiState.latestResult?.let { result ->
                        Spacer(modifier = Modifier.height(16.dp))
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.primaryContainer
                            )
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp)
                            ) {
                                Text(
                                    "✓ Transformation Complete",
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Similarity: ${(result.similarityScore * 100).toInt()}%")
                                Text("Latency: ${result.latencyMs}ms")
                            }
                        }
                    }
                }
            }

            // Instructions
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        "📖 How to Practice",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("1. Enter a Hebrew phrase", style = MaterialTheme.typography.bodyMedium)
                    Text("2. Tap record and speak clearly", style = MaterialTheme.typography.bodyMedium)
                    Text("3. Listen to AI transformation", style = MaterialTheme.typography.bodyMedium)
                    Text("4. Compare and improve", style = MaterialTheme.typography.bodyMedium)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Session History
            Text(
                "Previous Sessions",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            if (uiState.sessions.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "No practice sessions yet",
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(uiState.sessions) { session ->
                        SessionCard(session)
                    }
                }
            }
        }
    }
}

@Composable
private fun SessionCard(session: V2VSession) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    "Session ${session.id.take(8)}",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "${session.totalTransforms} transformations",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
            Column(
                horizontalAlignment = Alignment.End
            ) {
                Text(
                    "Improvement: ${(session.scoreImprovement * 100).toInt()}%",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    "${session.creditsCharged} credits",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
        }
    }
}
