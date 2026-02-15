package tv.bayit.plus.feature.profile.add

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
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
                    onValueChange = { if (uiState is AddProfileUiState.Error) onDismissError(); onNameChange(it) },
                    label = "Profile Name",
                    enabled = !isLoading,
                )

                if (input?.fieldError != null) {
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                    Text(input.fieldError, color = DesignTokens.Colors.Semantic.error, style = MaterialTheme.typography.bodySmall)
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
                    Text(uiState.message, color = DesignTokens.Colors.Semantic.error, style = MaterialTheme.typography.bodySmall)
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

@Composable
private fun AvatarSelector(
    selectedUrl: String,
    onAvatarSelected: (String) -> Unit,
    enabled: Boolean,
) {
    Text("Choose Avatar", style = MaterialTheme.typography.titleSmall, color = DesignTokens.Colors.Text.primary)
    Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.xs),
    ) {
        items(AVATAR_OPTIONS, key = { it }) { avatarUrl ->
            val isSelected = avatarUrl == selectedUrl
            val borderColor = if (isSelected) DesignTokens.Colors.Primary.base else DesignTokens.Colors.Glass.bgLight
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(borderColor)
                    .padding(2.dp)
                    .clip(CircleShape)
                    .clickable(enabled = enabled) { onAvatarSelected(avatarUrl) },
                contentAlignment = Alignment.Center,
            ) {
                CachedAsyncImage(url = avatarUrl, contentDescription = "Avatar option", modifier = Modifier.size(60.dp).clip(CircleShape))
            }
        }
    }
}

@Composable
private fun AgeGroupPicker(
    selectedGroup: AgeGroup,
    onGroupSelected: (AgeGroup) -> Unit,
    enabled: Boolean,
) {
    Text("Age Group", style = MaterialTheme.typography.titleSmall, color = DesignTokens.Colors.Text.primary)
    Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
    Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
        AgeGroup.entries.forEach { group ->
            val isSelected = group == selectedGroup
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(enabled = enabled) { onGroupSelected(group) },
            ) {
                Text(
                    text = group.displayLabel,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (isSelected) DesignTokens.Colors.Primary.base else DesignTokens.Colors.Text.secondary,
                )
            }
        }
    }
}

private val AVATAR_OPTIONS = listOf(
    "https://cdn.bayit.tv/avatars/aleph.png",
    "https://cdn.bayit.tv/avatars/bet.png",
    "https://cdn.bayit.tv/avatars/gimel.png",
    "https://cdn.bayit.tv/avatars/dalet.png",
    "https://cdn.bayit.tv/avatars/hei.png",
    "https://cdn.bayit.tv/avatars/vav.png",
)
