package tv.bayit.plus.feature.settings.language

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
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
import tv.bayit.plus.designsystem.component.GlassSpinner
import tv.bayit.plus.designsystem.component.SpinnerSize
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun LanguageSettingsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: LanguageSettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    LanguageSettingsScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onSelectLanguage = viewModel::selectLanguage,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun LanguageSettingsScreen(
    uiState: LanguageUiState,
    onNavigateBack: () -> Unit,
    onSelectLanguage: (String) -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("settings.language"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = bayitString("common.back"), tint = DesignTokens.Colors.Text.primary)
                }
            },
            actions = {
                if (uiState is LanguageUiState.Success && uiState.isSaving) {
                    GlassSpinner(size = SpinnerSize.SMALL)
                }
            },
        )
        when (uiState) {
            is LanguageUiState.Loading -> GlassLoadingIndicator()
            is LanguageUiState.Error -> LanguageErrorContent(message = uiState.message, onRetry = onRetry)
            is LanguageUiState.Success -> LanguageListContent(
                selectedCode = uiState.selectedCode,
                isSaving = uiState.isSaving,
                onSelectLanguage = onSelectLanguage,
            )
        }
    }
}

@Composable
private fun LanguageListContent(
    selectedCode: String,
    isSaving: Boolean,
    onSelectLanguage: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
        items(items = supportedLanguages(), key = { it.code }) { lang ->
            val isSelected = lang.code == selectedCode
            GlassCard(modifier = Modifier.fillMaxWidth().clickable(enabled = !isSaving) { onSelectLanguage(lang.code) }) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    RadioButton(
                        selected = isSelected,
                        onClick = { onSelectLanguage(lang.code) },
                        enabled = !isSaving,
                        colors = RadioButtonDefaults.colors(
                            selectedColor = DesignTokens.Colors.Primary.light,
                            unselectedColor = DesignTokens.Colors.Text.muted,
                        ),
                    )
                    Column(modifier = Modifier.weight(1f).padding(start = DesignTokens.Spacing.sm)) {
                        Text(text = lang.nativeName, color = DesignTokens.Colors.Text.primary, style = MaterialTheme.typography.bodyLarge)
                        Text(text = lang.code.uppercase(), color = DesignTokens.Colors.Text.muted, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
        item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
    }
}

@Composable
private fun LanguageErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
