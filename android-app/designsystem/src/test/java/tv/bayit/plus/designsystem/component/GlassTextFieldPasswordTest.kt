package tv.bayit.plus.designsystem.component

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertDoesNotExist
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.performClick
import org.junit.Rule
import org.junit.Test

class GlassTextFieldPasswordTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun `when isPassword true, show password icon is displayed by default`() {
        composeTestRule.setContent {
            GlassTextField(
                value = "secret123",
                onValueChange = {},
                isPassword = true
            )
        }
        composeTestRule.onNodeWithContentDescription("Show password").assertIsDisplayed()
    }

    @Test
    fun `tapping eye icon changes contentDescription to Hide password`() {
        composeTestRule.setContent {
            GlassTextField(
                value = "secret123",
                onValueChange = {},
                isPassword = true
            )
        }
        composeTestRule.onNodeWithContentDescription("Show password").performClick()
        composeTestRule.onNodeWithContentDescription("Hide password").assertIsDisplayed()
    }

    @Test
    fun `tapping eye icon twice returns to Show password state`() {
        composeTestRule.setContent {
            GlassTextField(
                value = "secret123",
                onValueChange = {},
                isPassword = true
            )
        }
        composeTestRule.onNodeWithContentDescription("Show password").performClick()
        composeTestRule.onNodeWithContentDescription("Hide password").performClick()
        composeTestRule.onNodeWithContentDescription("Show password").assertIsDisplayed()
    }

    @Test
    fun `when isPassword false, no eye icon is shown`() {
        composeTestRule.setContent {
            GlassTextField(
                value = "hello",
                onValueChange = {},
                isPassword = false
            )
        }
        composeTestRule.onNodeWithContentDescription("Show password").assertDoesNotExist()
        composeTestRule.onNodeWithContentDescription("Hide password").assertDoesNotExist()
    }
}
