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
import tv.bayit.plus.feature.discover.model.FeaturePrerequisite
import tv.bayit.plus.feature.discover.ui.DiscoverFeatureDetailSheet

@RunWith(AndroidJUnit4::class)
class InteractiveMissionTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val feature = DiscoverFeatureCatalog.featureById("interactive_mission")!!

    @Test
    fun interactiveMission_isIosOnlyInCatalog() {
        assert(DiscoverPlatform.ANDROID !in feature.platforms)
        assert(DiscoverPlatform.IOS in feature.platforms)
    }

    @Test
    fun interactiveMission_platformOnly_badgeDisplayed() {
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
    fun interactiveMission_setupNeeded_showsAllPrerequisites() {
        val missing = listOf(
            FeaturePrerequisite(
                id = "interactive_mission_microphone",
                type = FeaturePrerequisite.PrerequisiteType.MICROPHONE,
                labelKey = "discover.prereq.microphone",
            ),
            FeaturePrerequisite(
                id = "interactive_mission_avatar",
                type = FeaturePrerequisite.PrerequisiteType.AVATAR,
                labelKey = "discover.prereq.avatar",
                fixRoute = "bayitplus://settings/avatar",
            ),
        )

        composeTestRule.setContent {
            DiscoverFeatureDetailSheet(
                feature = feature,
                availability = FeatureAvailabilityState.SetupNeeded(missing),
                config = null,
                onDismiss = {},
                onStartWalkthrough = {},
                onNavigateToPlayer = { _, _ -> },
                onNavigateToZehAni = {},
            )
        }

        composeTestRule
            .onNode(hasText("discover.prereq.microphone", substring = true, ignoreCase = true))
            .assertIsDisplayed()

        composeTestRule
            .onNode(hasText("discover.prereq.avatar", substring = true, ignoreCase = true))
            .assertIsDisplayed()
    }

    @Test
    fun interactiveMission_detailSheet_displaysDescription() {
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
}
