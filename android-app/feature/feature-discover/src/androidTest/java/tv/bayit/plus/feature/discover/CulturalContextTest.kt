package tv.bayit.plus.feature.discover

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tv.bayit.plus.feature.discover.model.DiscoverFeatureCatalog
import tv.bayit.plus.feature.discover.model.DiscoverPlatform
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState
import tv.bayit.plus.feature.discover.ui.DiscoverFeatureDetailSheet

@RunWith(AndroidJUnit4::class)
class CulturalContextTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val feature = DiscoverFeatureCatalog.featureById("cultural_context")!!

    @Test
    fun culturalContext_isIosOnlyInCatalog() {
        assert(DiscoverPlatform.ANDROID !in feature.platforms)
        assert(DiscoverPlatform.IOS in feature.platforms)
    }

    @Test
    fun culturalContext_platformOnly_badgeDisplayed() {
        composeTestRule.setContent {
            DiscoverFeatureDetailSheet(
                feature = feature,
                availability = FeatureAvailabilityState.PlatformOnly(DiscoverPlatform.IOS),
                config = null,
                onDismiss = {},
                onStartWalkthrough = {},
                onNavigateToPlayer = { _, _ -> },
                onNavigateToZehAni = {},
            )
        }

        composeTestRule
            .onNode(hasText("discover.availability.notAvailable", substring = true, ignoreCase = true))
            .assertIsDisplayed()
    }

    @Test
    fun culturalContext_detailSheet_displaysDescription() {
        composeTestRule.setContent {
            DiscoverFeatureDetailSheet(
                feature = feature,
                availability = FeatureAvailabilityState.PlatformOnly(DiscoverPlatform.IOS),
                config = null,
                onDismiss = {},
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
    fun culturalContext_platformOnly_noWalkthroughButton() {
        composeTestRule.setContent {
            DiscoverFeatureDetailSheet(
                feature = feature,
                availability = FeatureAvailabilityState.PlatformOnly(DiscoverPlatform.IOS),
                config = null,
                onDismiss = {},
                onStartWalkthrough = {},
                onNavigateToPlayer = { _, _ -> },
                onNavigateToZehAni = {},
            )
        }

        composeTestRule
            .onNode(hasText("discover.walkthrough.tryItNow", substring = true, ignoreCase = true))
            .assertDoesNotExist()
    }
}
