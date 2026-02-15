package tv.bayit.plus.ui.screens.zehani

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.data.model.zehani.FeedbackItem
import tv.bayit.plus.ui.viewmodel.zehani.FeedbackViewModel
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun FeedbackScreen(
    profileId: String,
    onNavigateBack: () -> Unit,
    viewModel: FeedbackViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(profileId) {
        viewModel.loadFeedback(profileId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Feedback Inbox") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading && uiState.feedback.isEmpty()) {
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
        } else if (uiState.feedback.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(32.dp)
                ) {
                    Text("📬", style = MaterialTheme.typography.displayLarge)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "No Feedback Yet",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Feedback from your interactions will appear here",
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(uiState.feedback) { feedback ->
                    FeedbackCard(feedback)
                }
            }
        }
    }
}

@Composable
private fun FeedbackCard(feedback: FeedbackItem) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            getFeatureIcon(feedback.featureType),
                            style = MaterialTheme.typography.titleLarge
                        )
                        Text(
                            getFeatureName(feedback.featureType),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        formatDate(feedback.createdAt),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }

                feedback.rating?.let { rating ->
                    RatingBadge(rating)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                feedback.feedbackText,
                style = MaterialTheme.typography.bodyMedium
            )

            feedback.metadata?.let { metadata ->
                if (metadata.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp)
                        ) {
                            Text(
                                "Details",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            metadata.forEach { (key, value) ->
                                Text(
                                    "$key: $value",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RatingBadge(rating: Int) {
    Surface(
        color = when {
            rating >= 4 -> MaterialTheme.colorScheme.primaryContainer
            rating >= 2 -> MaterialTheme.colorScheme.tertiaryContainer
            else -> MaterialTheme.colorScheme.errorContainer
        },
        shape = MaterialTheme.shapes.small
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            repeat(rating) {
                Text("⭐", style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

private fun getFeatureIcon(featureType: String): String {
    return when (featureType.lowercase()) {
        "magic_mirror" -> "🪞"
        "v2v" -> "🎤"
        "highlight_reel" -> "🎬"
        "contacts" -> "👥"
        "avatar" -> "🎭"
        else -> "📝"
    }
}

private fun getFeatureName(featureType: String): String {
    return when (featureType.lowercase()) {
        "magic_mirror" -> "Magic Mirror"
        "v2v" -> "Voice Practice"
        "highlight_reel" -> "Highlight Reel"
        "contacts" -> "Contacts"
        "avatar" -> "3D Avatar"
        else -> featureType.replace("_", " ").capitalize()
    }
}

private fun formatDate(dateString: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val outputFormat = SimpleDateFormat("MMM dd, yyyy 'at' h:mm a", Locale.getDefault())
        val date = inputFormat.parse(dateString)
        outputFormat.format(date ?: Date())
    } catch (e: Exception) {
        dateString
    }
}
