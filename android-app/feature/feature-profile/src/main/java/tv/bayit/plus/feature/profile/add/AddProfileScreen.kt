package tv.bayit.plus.feature.profile.add

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun AddProfileRoute(
    onNavigateBack: () -> Unit,
    onProfileCreated: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: AddProfileViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(uiState) {
        if (uiState is AddProfileUiState.Success) {
            onProfileCreated()
        }
    }

    AddProfileScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onNameChange = viewModel::updateName,
        onAvatarSelected = viewModel::updateSelectedAvatarUrl,
        onAgeGroupSelected = viewModel::updateAgeGroup,
        onCreateClick = viewModel::createProfile,
        onDismissError = viewModel::dismissError,
        modifier = modifier,
    )
}

@Composable
internal fun AddProfileScreen(
    uiState: AddProfileUiState,
    onNavigateBack: () -> Unit,
    onNameChange: (String) -> Unit,
    onAvatarSelected: (String) -> Unit,
    onAgeGroupSelected: (AgeGroup) -> Unit,
    onCreateClick: () -> Unit,
    onDismissError: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val keyboardController = LocalSoftwareKeyboardController.current
    val isLoading = uiState is AddProfileUiState.Loading
    val input = when (uiState) {
        is AddProfileUiState.Input -> uiState
        is AddProfileUiState.Error -> uiState.previousInput
        else -> null
    }

    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Add Profile",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = DesignTokens.Colors.Text.primary,
                    )
                }
            },
        )

        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = DesignTokens.Spacing.xl),
            ) {
                Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))

                GlassTextField(
                    value = input?.name.orEmpty(),
                    onValueChange = {
                        if (uiState is AddProfileUiState.Error) onDismissError()
                        onNameChange(it)
                    },
                    label = "Profile Name",
                    enabled = !isLoading,
                )

                if (input?.fieldError != null) {
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                    Text(
                        input.fieldError,
                        color = DesignTokens.Colors.Semantic.error,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))

                AvatarSelector(
                    selectedUrl = input?.selectedAvatarUrl.orEmpty(),
                    onAvatarSelected = onAvatarSelected,
                    enabled = !isLoading,
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))

                AgeGroupPicker(
                    selectedGroup = input?.ageGroup ?: AgeGroup.ADULT,
                    onGroupSelected = onAgeGroupSelected,
                    enabled = !isLoading,
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))

                if (uiState is AddProfileUiState.Error) {
                    Text(
                        uiState.message,
                        color = DesignTokens.Colors.Semantic.error,
                        style = MaterialTheme.typography.bodySmall,
                    )
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.base))
                }

                GlassButton(
                    text = "Create Profile",
                    onClick = { keyboardController?.hide(); onCreateClick() },
                    enabled = !isLoading,
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxl))
            }

            if (isLoading) {
                GlassLoadingIndicator()
            }
        }
    }
}
