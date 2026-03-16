package tv.bayit.plus.feature.auth.login

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tv.bayit.plus.designsystem.component.GlassTextField

@RunWith(AndroidJUnit4::class)
class LoginPasswordToggleTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun passwordToggleShowsAndHidesPassword() {
        composeTestRule.setContent {
            GlassTextField(
                value = "mypassword",
                onValueChange = {},
                isPassword = true,
                label = "Password"
            )
        }

        // Initially shows "Show password"
        composeTestRule
            .onNodeWithContentDescription("Show password")
            .assertIsDisplayed()

        // Tap to reveal
        composeTestRule
            .onNodeWithContentDescription("Show password")
            .performClick()

        // Now shows "Hide password"
        composeTestRule
            .onNodeWithContentDescription("Hide password")
            .assertIsDisplayed()

        // Tap to hide again
        composeTestRule
            .onNodeWithContentDescription("Hide password")
            .performClick()

        // Back to "Show password"
        composeTestRule
            .onNodeWithContentDescription("Show password")
            .assertIsDisplayed()
    }
}
