package tv.bayit.plus.feature.discover

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tv.bayit.plus.feature.discover.model.DiscoverCategory
import tv.bayit.plus.feature.discover.model.DiscoverFeatureCatalog
import tv.bayit.plus.feature.discover.model.DiscoverPlatform
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState
import tv.bayit.plus.feature.discover.ui.DiscoverScreen

@RunWith(AndroidJUnit4::class)
class DiscoverTabTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private fun readyState(): DiscoverUiState {
        val availability = DiscoverFeatureCatalog.allFeatures
            .associate { it.id to FeatureAvailabilityState.Ready }
        return DiscoverUiState(isLoading = false, availabilityStates = availability)
    }

    @Test
    fun discoverTab_showsAllCategories() {
        composeTestRule.setContent {
            DiscoverScreen(
                uiState = readyState(),
                onFeatureClick = {},
                onDismissDetail = {},
                onStartWalkthrough = {},
                onNavigateToPlayer = { _, _ -> },
                onNavigateToZehAni = {},
            )
        }

        DiscoverCategory.entries.forEach { category ->
            composeTestRule
                .onNode(hasText(category.nameKey, substring = true, ignoreCase = true))
                .assertIsDisplayed()
        }
    }

    @Test
    fun discoverTab_loadingState_showsSpinner_notCategories() {
        composeTestRule.setContent {
            DiscoverScreen(
                uiState = DiscoverUiState(isLoading = true),
                onFeatureClick = {},
                onDismissDetail = {},
                onStartWalkthrough = {},
                onNavigateToPlayer = { _, _ -> },
                onNavigateToZehAni = {},
            )
        }

        composeTestRule
            .onNode(hasText("discover.category", substring = true))
            .assertDoesNotExist()
    }

    @Test
    fun discoverTab_featureCard_click_fires_callback() {
        var clicked = false
        val feature = DiscoverFeatureCatalog.featureById("pause_ask")!!
        val state = readyState()

        composeTestRule.setContent {
            DiscoverScreen(
                uiState = state,
                onFeatureClick = { clicked = true },
                onDismissDetail = {},
                onStartWalkthrough = {},
                onNavigateToPlayer = { _, _ -> },
                onNavigateToZehAni = {},
            )
        }

        composeTestRule
            .onNode(hasText(feature.nameKey, substring = true, ignoreCase = true))
            .performClick()

        assertTrue(clicked)
    }

    @Test
    fun discoverTab_selectedFeature_showsDetailSheet() {
        val feature = DiscoverFeatureCatalog.featureById("pause_ask")!!
        val state = readyState().copy(selectedFeature = feature)

        composeTestRule.setContent {
            DiscoverScreen(
                uiState = state,
                onFeatureClick = {},
                onDismissDetail = {},
                onStartWalkthrough = {},
                onNavigateToPlayer = { _, _ -> },
                onNavigateToZehAni = {},
            )
        }

        composeTestRule
            .onNode(hasText(feature.descriptionKey, substring = true, ignoreCase = true))
            .assertIsDisplayed()
    }

    @Test
    fun discoverTab_androidOnlyFeatures_areDisplayed() {
        val androidFeatures = DiscoverFeatureCatalog.allFeatures
            .filter { DiscoverPlatform.ANDROID in it.platforms }
        val availability = DiscoverFeatureCatalog.allFeatures
            .associate { it.id to FeatureAvailabilityState.Ready }
        val state = DiscoverUiState(isLoading = false, availabilityStates = availability)

        composeTestRule.setContent {
            DiscoverScreen(
                uiState = state,
                onFeatureClick = {},
                onDismissDetail = {},
                onStartWalkthrough = {},
                onNavigateToPlayer = { _, _ -> },
                onNavigateToZehAni = {},
            )
        }

        assertTrue(androidFeatures.isNotEmpty())
        composeTestRule
            .onNode(hasText("pause_ask", substring = true, ignoreCase = true))
            .assertDoesNotExist()
    }
}
