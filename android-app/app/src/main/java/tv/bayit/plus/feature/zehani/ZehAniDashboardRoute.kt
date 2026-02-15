package tv.bayit.plus.feature.zehani

import androidx.compose.runtime.Composable
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.ui.screens.zehani.ZehAniHubScreen

@Composable
fun ZehAniDashboardRoute(
    onNavigateToMagicMirror: () -> Unit,
    onNavigateToV2V: () -> Unit,
    onNavigateToAvatar3D: () -> Unit,
    onNavigateToHighlights: () -> Unit,
    onNavigateToContacts: () -> Unit,
    onNavigateToFeedback: () -> Unit,
    onNavigateToConsent: () -> Unit,
    onNavigateBack: () -> Unit
) {
    ZehAniHubScreen(
        profileId = "current", // Will be replaced with actual profile ID from auth
        onNavigateToFeature = { feature ->
            when (feature) {
                "magic_mirror" -> onNavigateToMagicMirror()
                "v2v" -> onNavigateToV2V()
                "avatar_3d" -> onNavigateToAvatar3D()
                "highlights" -> onNavigateToHighlights()
                "contacts" -> onNavigateToContacts()
                "feedback" -> onNavigateToFeedback()
                "consent" -> onNavigateToConsent()
            }
        },
        onNavigateBack = onNavigateBack
    )
}
