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
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun ProfileRoute(
    onNavigateBack: () -> Unit,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    ProfileScreen(
        uiState = uiState,
        onDisplayNameChange = viewModel::updateDisplayName,
        onAvatarUrlChange = viewModel::updateAvatarUrl,
        onSave = viewModel::saveProfile,
        onRetry = viewModel::retry,
        onSignOut = {
            viewModel.signOut()
            onSignOut()
        },
        modifier = modifier,
    )
}

@Composable
internal fun ProfileScreen(
    uiState: ProfileUiState,
    onDisplayNameChange: (String) -> Unit,
    onAvatarUrlChange: (String) -> Unit,
    onSave: () -> Unit,
    onRetry: () -> Unit,
    onSignOut: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        when (uiState) {
            is ProfileUiState.Loading -> GlassLoadingIndicator()
            is ProfileUiState.Error -> ProfileErrorContent(message = uiState.message, onRetry = onRetry)
            is ProfileUiState.Success -> ProfileEditContent(
                state = uiState,
                onDisplayNameChange = onDisplayNameChange,
                onAvatarUrlChange = onAvatarUrlChange,
                onSave = onSave,
                onSignOut = onSignOut,
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
    onSignOut: () -> Unit,
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
                Text(text = bayitString("profile.email"), color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                Text(text = state.email, color = DesignTokens.Colors.Text.secondary, style = MaterialTheme.typography.bodyMedium)
            }
        }
        Spacer(Modifier.height(DesignTokens.Spacing.md))
        GlassTextField(
            value = state.displayName,
            onValueChange = onDisplayNameChange,
            label = bayitString("profile.displayName"),
            enabled = !state.isSaving,
        )
        Spacer(Modifier.height(DesignTokens.Spacing.md))
        GlassTextField(
            value = state.avatarUrl,
            onValueChange = onAvatarUrlChange,
            label = bayitString("profile.avatarUrl"),
            enabled = !state.isSaving,
        )
        Spacer(Modifier.height(DesignTokens.Spacing.md))
        if (state.language.isNotEmpty()) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(text = bayitString("settings.language"), color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                    Text(text = state.language, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyMedium)
                }
            }
            Spacer(Modifier.height(DesignTokens.Spacing.md))
        }
        GlassButton(
            text = bayitString("common.save"),
            onClick = onSave,
            enabled = !state.isSaving,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(DesignTokens.Spacing.xl))
        GlassButton(
            text = bayitString("auth.signOut"),
            onClick = onSignOut,
            isPrimary = false,
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
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
