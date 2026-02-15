package tv.bayit.plus.feature.zehani.contacts

import androidx.compose.runtime.Composable
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.ui.screens.zehani.ContactsScreen
import tv.bayit.plus.ui.viewmodel.zehani.ContactsViewModel

@Composable
fun ContactsRoute(
    onNavigateBack: () -> Unit,
    viewModel: ContactsViewModel = hiltViewModel()
) {
    ContactsScreen(
        profileId = "current", // Will be replaced with actual profile ID
        onNavigateBack = onNavigateBack,
        viewModel = viewModel
    )
}
