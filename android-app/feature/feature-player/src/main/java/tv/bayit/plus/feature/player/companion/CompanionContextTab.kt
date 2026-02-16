package tv.bayit.plus.feature.player.companion

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Cultural context tab in the AI companion sidebar.
 *
 * Displays cultural background information, historical context,
 * and explanations relevant to the current content.
 * Data loaded from content API via [CompanionViewModel].
 */
@Composable
fun CompanionContextTab(
    contentId: String,
    modifier: Modifier = Modifier,
    viewModel: CompanionViewModel = hiltViewModel(),
) {
    val contextItems by viewModel.contextItems.collectAsState()
    val isLoading by viewModel.isContextLoading.collectAsState()

    LaunchedEffect(contentId) {
        viewModel.loadContext(contentId)
    }

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(top = DesignTokens.Spacing.md),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item {
            Text(
                text = "Cultural Context",
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.base,
                fontWeight = FontWeight.SemiBold,
            )
        }

        if (isLoading) {
            item { GlassLoadingIndicator() }
        } else if (contextItems.isEmpty()) {
            item { ContextEmptyState() }
        } else {
            items(contextItems) { item ->
                ContextCard(title = item.title, description = item.description)
            }
        }
    }
}

@Composable
private fun ContextEmptyState() {
    Column(
        modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "No cultural context available for this content yet.",
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.sm,
        )
    }
}

@Composable
private fun ContextCard(title: String, description: String) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Text(
                text = title,
                color = DesignTokens.Colors.Primary.light,
                fontSize = DesignTokens.FontSize.sm,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = description,
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.sm,
            )
        }
    }
}
