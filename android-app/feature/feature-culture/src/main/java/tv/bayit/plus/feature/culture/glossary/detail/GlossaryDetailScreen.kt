package tv.bayit.plus.feature.culture.glossary.detail

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
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun GlossaryDetailRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: GlossaryDetailViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    GlossaryDetailScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun GlossaryDetailScreen(
    uiState: GlossaryDetailUiState,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("culture.glossary.termDetail"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = bayitString("common.back"), tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        when (uiState) {
            is GlossaryDetailUiState.Loading -> GlassLoadingIndicator()
            is GlossaryDetailUiState.Error -> GlossaryDetailErrorContent(message = uiState.message, onRetry = onRetry)
            is GlossaryDetailUiState.Success -> GlossaryDetailContent(termData = uiState.termData)
        }
    }
}

@Composable
private fun GlossaryDetailContent(termData: Any) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                Text(
                    text = bayitString("culture.glossary.definition"),
                    style = MaterialTheme.typography.titleMedium,
                    color = DesignTokens.Colors.Primary.light,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = termData.toString(),
                    style = MaterialTheme.typography.bodyLarge,
                    color = DesignTokens.Colors.Text.primary,
                )
            }
        }
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
                Text(
                    text = bayitString("culture.glossary.pronunciation"),
                    style = MaterialTheme.typography.titleMedium,
                    color = DesignTokens.Colors.Primary.light,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = termData.toString(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary,
                )
            }
        }
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
                Text(
                    text = bayitString("culture.glossary.examples"),
                    style = MaterialTheme.typography.titleMedium,
                    color = DesignTokens.Colors.Primary.light,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = termData.toString(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary,
                )
            }
        }
        Spacer(Modifier.height(DesignTokens.Spacing.xxl))
    }
}

@Composable
private fun GlossaryDetailErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(text = message, style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
