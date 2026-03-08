package tv.bayit.plus.feature.profile.edit

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
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun EditProfileRoute(
    onNavigateBack: () -> Unit,
    onProfileSaved: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: EditProfileViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(uiState) {
        if (uiState is EditProfileUiState.Saved) onProfileSaved()
    }

    EditProfileScreen(uiState, onNavigateBack, viewModel::updateName, viewModel::updateAvatar,
        viewModel::save, viewModel::dismissError, modifier, avatarUrls = viewModel.avatarUrls)
}

@Composable
internal fun EditProfileScreen(
    uiState: EditProfileUiState,
    onNavigateBack: () -> Unit,
    onNameChange: (String) -> Unit,
    onAvatarSelected: (String) -> Unit,
    onSaveClick: () -> Unit,
    onDismissError: () -> Unit,
    modifier: Modifier = Modifier,
    avatarUrls: List<String> = emptyList(),
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Edit Profile",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = DesignTokens.Colors.Text.primary)
                }
            },
        )

        Box(modifier = Modifier.fillMaxSize()) {
            when (uiState) {
                is EditProfileUiState.Loading, is EditProfileUiState.Saving -> GlassLoadingIndicator()
                is EditProfileUiState.Input -> Column(
                    Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = DesignTokens.Spacing.xl),
                ) {
                    Spacer(Modifier.height(DesignTokens.Spacing.xl))
                    GlassTextField(value = uiState.name, onValueChange = onNameChange, label = "Profile Name", singleLine = true)
                    Spacer(Modifier.height(DesignTokens.Spacing.lg))
                    Text(text = "Choose Avatar", style = MaterialTheme.typography.titleSmall, color = DesignTokens.Colors.Text.primary)
                    Spacer(Modifier.height(DesignTokens.Spacing.sm))
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                        contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.xs),
                    ) {
                        items(avatarUrls, key = { it }) { url ->
                            val border = if (url == uiState.avatarUrl) DesignTokens.Colors.Primary.base else DesignTokens.Colors.Glass.bgLight
                            Box(
                                Modifier.size(64.dp).clip(CircleShape).background(border).padding(2.dp).clip(CircleShape).clickable { onAvatarSelected(url) },
                                contentAlignment = Alignment.Center,
                            ) {
                                CachedAsyncImage(url, "Avatar", Modifier.size(60.dp).clip(CircleShape))
                            }
                        }
                    }
                    Spacer(Modifier.height(DesignTokens.Spacing.xl))
                    GlassButton("Save Changes", onSaveClick, enabled = uiState.name.isNotBlank(), modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(DesignTokens.Spacing.xxl))
                }
                is EditProfileUiState.Error -> Column(
                    Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.xl),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Spacer(Modifier.height(DesignTokens.Spacing.xxl))
                    Text(uiState.message, style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Semantic.error)
                    Spacer(Modifier.height(DesignTokens.Spacing.xl))
                    GlassButton("Retry", onDismissError, modifier = Modifier.fillMaxWidth())
                }
                is EditProfileUiState.Saved -> Unit
            }
        }
    }
}
