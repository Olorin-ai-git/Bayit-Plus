package tv.bayit.plus.feature.zehani.consent

import androidx.compose.runtime.Composable
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.ui.screens.zehani.BiometricConsentScreen
import tv.bayit.plus.ui.viewmodel.zehani.BiometricConsentViewModel

@Composable
fun BiometricConsentRoute(
    onNavigateBack: () -> Unit,
    viewModel: BiometricConsentViewModel = hiltViewModel()
) {
    BiometricConsentScreen(
        profileId = "current", // Will be replaced with actual profile ID
        onNavigateBack = onNavigateBack,
        viewModel = viewModel
    )
}
