package tv.bayit.plus.feature.settings.help

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
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
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun HelpRoute(
    onNavigateBack: () -> Unit,
    onNavigateToSupport: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: HelpViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    HelpScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onNavigateToSupport = onNavigateToSupport,
        onToggleFaq = viewModel::toggleFaqExpanded,
        modifier = modifier,
    )
}

@Composable
internal fun HelpScreen(
    uiState: HelpUiState,
    onNavigateBack: () -> Unit,
    onNavigateToSupport: () -> Unit,
    onToggleFaq: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("settings.help.title"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = bayitString("common.back"), tint = DesignTokens.Colors.Text.primary)
                }
            },
        )
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            item { Spacer(Modifier.height(DesignTokens.Spacing.base)) }
            item {
                Text(
                    text = bayitString("settings.help.faq"),
                    color = DesignTokens.Colors.Text.primary,
                    style = MaterialTheme.typography.titleMedium,
                )
            }
            itemsIndexed(items = uiState.faqItems, key = { index, _ -> index }) { index, faq ->
                FaqCard(item = faq, onToggle = { onToggleFaq(index) })
            }
            item {
                Spacer(Modifier.height(DesignTokens.Spacing.base))
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Column {
                        Text(
                            text = bayitString("settings.help.needMoreHelp"),
                            color = DesignTokens.Colors.Text.primary,
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Spacer(Modifier.height(DesignTokens.Spacing.sm))
                        Text(
                            text = bayitString("settings.help.contactDescription"),
                            color = DesignTokens.Colors.Text.secondary,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        Spacer(Modifier.height(DesignTokens.Spacing.md))
                        GlassButton(
                            text = bayitString("settings.help.contactSupport"),
                            onClick = onNavigateToSupport,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }
            item { Spacer(Modifier.height(DesignTokens.Spacing.xxl)) }
        }
    }
}

@Composable
private fun FaqCard(item: FaqItem, onToggle: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth().clickable(onClick = onToggle)) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = item.question,
                    color = DesignTokens.Colors.Text.primary,
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.weight(1f),
                )
                Icon(
                    imageVector = if (item.isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = if (item.isExpanded) bayitString("common.collapse") else bayitString("common.expand"),
                    tint = DesignTokens.Colors.Text.muted,
                )
            }
            AnimatedVisibility(visible = item.isExpanded) {
                Text(
                    text = item.answer,
                    color = DesignTokens.Colors.Text.secondary,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(top = DesignTokens.Spacing.sm),
                )
            }
        }
    }
}
