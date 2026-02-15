package tv.bayit.plus.ui.screens.zehani

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.ui.viewmodel.zehani.ZehAniHubViewModel

data class ZehAniFeature(
    val icon: String,
    val title: String,
    val description: String,
    val route: String,
    val requiresAvatar: Boolean = false
)

@Composable
fun ZehAniHubScreen(
    profileId: String,
    onNavigateToFeature: (String) -> Unit,
    viewModel: ZehAniHubViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(profileId) {
        viewModel.checkAvatarStatus(profileId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Me in the Story") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f)
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Header
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "זה אני",
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Create your personalized AI avatar and explore interactive features",
                    style = MaterialTheme.typography.bodyLarge,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
            }

            // Feature Grid
            val features = listOf(
                ZehAniFeature("🪞", "Magic Mirror", "Daily greetings in Hebrew", "magic_mirror"),
                ZehAniFeature("🎬", "Highlights", "Video highlight reels", "highlights", true),
                ZehAniFeature("🎤", "Voice Practice", "Hebrew pronunciation", "v2v", true),
                ZehAniFeature("👥", "Contacts", "WhatsApp contacts", "contacts"),
                ZehAniFeature("📬", "Feedback", "View feedback history", "feedback"),
                ZehAniFeature("🎨", "3D Avatar", "View your avatar", "avatar", true),
                ZehAniFeature("🔒", "Consent", "Manage permissions", "consent")
            )

            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(features) { feature ->
                    FeatureCard(
                        feature = feature,
                        onClick = { onNavigateToFeature(feature.route) }
                    )
                }
            }
        }
    }
}

@Composable
private fun FeatureCard(
    feature: ZehAniFeature,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = feature.icon,
                style = MaterialTheme.typography.displayMedium
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = feature.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = feature.description,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
            if (feature.requiresAvatar) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Requires avatar",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}
