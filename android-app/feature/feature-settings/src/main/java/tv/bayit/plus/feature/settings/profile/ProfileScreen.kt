package tv.bayit.plus.feature.settings.profile

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun ProfileRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    ProfileScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onDisplayNameChange = viewModel::updateDisplayName,
        onAvatarUrlChange = viewModel::updateAvatarUrl,
        onSave = viewModel::saveProfile,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun ProfileScreen(
    uiState: ProfileUiState,
    onNavigateBack: () -> Unit,
    onDisplayNameChange: (String) -> Unit,
    onAvatarUrlChange: (String) -> Unit,
    onSave: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Profile",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is ProfileUiState.Loading -> GlassLoadingIndicator()
            is ProfileUiState.Error -> ProfileErrorContent(message = uiState.message, onRetry = onRetry)
            is ProfileUiState.Success -> ProfileEditContent(
                state = uiState,
                onDisplayNameChange = onDisplayNameChange,
                onAvatarUrlChange = onAvatarUrlChange,
                onSave = onSave,
            )
        }
    }
}

@Composable
private fun ProfileEditContent(
    state: ProfileUiState.Success,
    onDisplayNameChange: (String) -> Unit,
    onAvatarUrlChange: (String) -> Unit,
    onSave: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = DesignTokens.Spacing.base),
    ) {
        Spacer(Modifier.height(DesignTokens.Spacing.base))
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column {
                Text(text = "Email", color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                Text(text = state.email, color = DesignTokens.Colors.Text.secondary, style = MaterialTheme.typography.bodyMedium)
            }
        }
        Spacer(Modifier.height(DesignTokens.Spacing.md))
        GlassTextField(
            value = state.displayName,
            onValueChange = onDisplayNameChange,
            label = "Display Name",
            enabled = !state.isSaving,
        )
        Spacer(Modifier.height(DesignTokens.Spacing.md))
        GlassTextField(
            value = state.avatarUrl,
            onValueChange = onAvatarUrlChange,
            label = "Avatar URL",
            enabled = !state.isSaving,
        )
        Spacer(Modifier.height(DesignTokens.Spacing.md))
        if (state.language.isNotEmpty()) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(text = "Language", color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                    Text(text = state.language, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyMedium)
                }
            }
            Spacer(Modifier.height(DesignTokens.Spacing.md))
        }
        GlassButton(
            text = "Save",
            onClick = onSave,
            enabled = !state.isSaving,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(DesignTokens.Spacing.xxl))
    }
}

@Composable
private fun ProfileErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
