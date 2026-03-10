package tv.bayit.plus.feature.profile.selection

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.AccountProfile
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun ProfileSelectionRoute(
    onNavigateToHome: () -> Unit,
    onNavigateToAddProfile: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ProfileSelectionViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(uiState) {
        if (uiState is ProfileSelectionUiState.ProfileSelected) onNavigateToHome()
    }
    ProfileSelectionScreen(
        uiState = uiState, onSelectProfile = viewModel::selectProfile,
        onAddProfile = onNavigateToAddProfile, onRetry = viewModel::loadProfiles,
        onDismissError = viewModel::dismissError, modifier = modifier,
    )
}

@Composable
internal fun ProfileSelectionScreen(
    uiState: ProfileSelectionUiState,
    onSelectProfile: (String) -> Unit,
    onAddProfile: () -> Unit,
    onRetry: () -> Unit,
    onDismissError: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize()) {
        when (uiState) {
            is ProfileSelectionUiState.Loading -> GlassLoadingIndicator()
            is ProfileSelectionUiState.Error -> ErrorContent(uiState.message, onRetry)
            is ProfileSelectionUiState.Loaded -> LoadedContent(
                uiState.profiles, uiState.selectingProfileId,
                uiState.errorMessage, onSelectProfile, onAddProfile, onDismissError,
            )
            is ProfileSelectionUiState.ProfileSelected -> GlassLoadingIndicator()
        }
    }
}

@Composable
private fun LoadedContent(
    profiles: List<AccountProfile>, selectingProfileId: String?,
    errorMessage: String?, onSelectProfile: (String) -> Unit,
    onAddProfile: () -> Unit, onDismissError: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxxxl))
        Text(bayitString("profiles.whoIsWatching"), style = MaterialTheme.typography.headlineLarge, color = DesignTokens.Colors.Text.primary)
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxl))
        if (errorMessage != null) {
            Text(errorMessage, color = DesignTokens.Colors.Semantic.error, style = MaterialTheme.typography.bodySmall)
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        }
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(DesignTokens.Spacing.sm),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.base),
            modifier = Modifier.weight(1f),
        ) {
            items(profiles, key = { it.id }) { profile ->
                ProfileCard(profile, selectingProfileId == profile.id) { onSelectProfile(profile.id) }
            }
            item { AddProfileCard(onClick = onAddProfile) }
        }
    }
}

@Composable
private fun ProfileCard(profile: AccountProfile, isSelecting: Boolean, onClick: () -> Unit) {
    GlassCard(modifier = Modifier.clickable(enabled = !isSelecting) { onClick() }) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(DesignTokens.Spacing.md)) {
            ProfileAvatar(profile.avatar, profile.avatarColor, profile.name)
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            Text(
                profile.name, style = MaterialTheme.typography.titleSmall,
                color = DesignTokens.Colors.Text.primary, maxLines = 1,
                overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center,
            )
            if (profile.isKidsProfile) {
                Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                Text(bayitString("profiles.kids"), style = MaterialTheme.typography.labelSmall, color = DesignTokens.Colors.Semantic.info)
            }
            if (isSelecting) {
                Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
                GlassSpinner(size = SpinnerSize.SMALL)
            }
        }
    }
}

@Composable
private fun ProfileAvatar(avatarUrl: String?, avatarColor: String, name: String) {
    val parsedColor = parseHexColor(avatarColor)
    Box(
        modifier = Modifier.size(72.dp).clip(CircleShape).background(parsedColor),
        contentAlignment = Alignment.Center,
    ) {
        if (avatarUrl != null) {
            CachedAsyncImage(url = avatarUrl, contentDescription = name, modifier = Modifier.size(72.dp).clip(CircleShape))
        } else {
            Text(name.take(1).uppercase(), style = MaterialTheme.typography.headlineMedium, color = DesignTokens.Colors.Text.primary)
        }
    }
}

@Composable
private fun AddProfileCard(onClick: () -> Unit) {
    GlassCard(modifier = Modifier.clickable { onClick() }) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(DesignTokens.Spacing.md)) {
            Box(
                modifier = Modifier.size(72.dp).clip(CircleShape).background(DesignTokens.Colors.Glass.bgLight),
                contentAlignment = Alignment.Center,
            ) {
                Text(bayitString("profiles.addIcon"), style = MaterialTheme.typography.headlineLarge, color = DesignTokens.Colors.Text.secondary)
            }
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
            Text(bayitString("profiles.addProfile"), style = MaterialTheme.typography.titleSmall, color = DesignTokens.Colors.Text.secondary, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(message, color = DesignTokens.Colors.Semantic.error, style = MaterialTheme.typography.bodyLarge)
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.base))
        GlassButton(text = bayitString("common.retry"), onClick = onRetry)
    }
}

private fun parseHexColor(hex: String): Color {
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (_: IllegalArgumentException) {
        Color(0xFF00D9FF)
    }
}
