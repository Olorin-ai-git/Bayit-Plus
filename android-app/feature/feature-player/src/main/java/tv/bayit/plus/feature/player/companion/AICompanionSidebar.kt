package tv.bayit.plus.feature.player.companion

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * AI companion sidebar container with tabbed content.
 *
 * Provides tabs for cultural context, quiz, and vocabulary learning
 * features alongside the video player.
 */
@Composable
fun AICompanionSidebar(
    contentId: String,
    modifier: Modifier = Modifier,
) {
    var selectedTab by remember { mutableIntStateOf(0) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.sm),
    ) {
        Text(
            text = bayitString("player.companion.title"),
            color = DesignTokens.Colors.Text.primary,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = DesignTokens.Spacing.sm),
        )

        val companionTabs = listOf(
            bayitString("player.companion.tabContext"),
            bayitString("player.companion.tabQuiz"),
            bayitString("player.companion.tabVocabulary"),
        )

        ScrollableTabRow(
            selectedTabIndex = selectedTab,
            containerColor = DesignTokens.Colors.Glass.bg,
            contentColor = DesignTokens.Colors.Text.primary,
            edgePadding = DesignTokens.Spacing.xs,
        ) {
            companionTabs.forEachIndexed { index, tab ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = {
                        Text(
                            text = tab,
                            color = if (selectedTab == index) {
                                DesignTokens.Colors.Primary.light
                            } else {
                                DesignTokens.Colors.Text.secondary
                            },
                            fontSize = DesignTokens.FontSize.sm,
                        )
                    },
                )
            }
        }

        when (selectedTab) {
            TAB_CONTEXT -> CompanionContextTab(contentId = contentId)
            TAB_QUIZ -> CompanionQuizTab(contentId = contentId)
            TAB_VOCABULARY -> CompanionVocabularyTab(contentId = contentId)
        }
    }
}

private const val TAB_CONTEXT = 0
private const val TAB_QUIZ = 1
private const val TAB_VOCABULARY = 2
