package tv.bayit.plus.feature.player.companion

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Vocabulary learning tab in the AI companion sidebar.
 *
 * Collects words that the user has tapped for translation during playback
 * and presents them as a vocabulary review list for language learning.
 * Connected to [CompanionViewModel] which receives translations from
 * the subtitle system.
 */
@Composable
fun CompanionVocabularyTab(
    contentId: String,
    modifier: Modifier = Modifier,
    viewModel: CompanionViewModel = hiltViewModel(),
) {
    val vocabularyItems by viewModel.vocabularyItems.collectAsState()

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(top = DesignTokens.Spacing.md),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item {
            Text(
                text = "Vocabulary",
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.base,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
            Text(
                text = "Words you have looked up during playback",
                color = DesignTokens.Colors.Text.secondary,
                fontSize = DesignTokens.FontSize.sm,
            )
        }

        if (vocabularyItems.isEmpty()) {
            item { VocabularyEmptyState() }
        } else {
            items(vocabularyItems) { item ->
                VocabularyCard(word = item.word, translation = item.translation)
            }
        }
    }
}

@Composable
private fun VocabularyEmptyState() {
    Column(
        modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Tap words in subtitles to add them here",
            color = DesignTokens.Colors.Text.secondary,
            fontSize = DesignTokens.FontSize.sm,
        )
    }
}

@Composable
private fun VocabularyCard(word: String, translation: String) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = word,
                color = DesignTokens.Colors.Text.primary,
                fontSize = DesignTokens.FontSize.base,
                fontWeight = FontWeight.Medium,
            )
            Text(
                text = translation,
                color = DesignTokens.Colors.Primary.light,
                fontSize = DesignTokens.FontSize.base,
            )
        }
    }
}
