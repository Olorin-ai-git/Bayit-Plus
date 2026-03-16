# Android Password Toggle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a show/hide password toggle to the Android login and register screens, matching the behavior already present on iOS, tvOS, and Web.

**Architecture:** Extend `GlassTextField` with an `isPassword` parameter that manages password visibility state internally and renders an eye icon toggle. Screens pass `isPassword = true` — no toggle logic at screen level.

**Tech Stack:** Kotlin, Jetpack Compose, Material Icons Extended, `GlassTextField` in `android-app/designsystem/`

---

## Context

- iOS: `GlassTextField(isSecure: true)` handles toggle internally — this mirrors that pattern exactly
- tvOS: `TVCredentialPanel` has eye toggle — same concept
- Web: `LoginPage` / `RegisterPage` use Eye/EyeOff icons from lucide-react
- Android: `GlassTextField` has a `visualTransformation` param but no built-in toggle, and neither login nor register passes one

Current `GlassTextField` signature (abbreviated):

```kotlin
@Composable
fun GlassTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String? = null,
    singleLine: Boolean = true,
    enabled: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
)
```

Note: no `trailingIcon` param yet — must be added.

---

## File Map

| File                                                                                                                | Action | Responsibility                                                            |
| ------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| `android-app/designsystem/build.gradle.kts`                                                                         | Modify | Add `material-icons-extended` dependency                                  |
| `android-app/designsystem/src/main/java/tv/bayit/plus/designsystem/component/GlassTextField.kt`                     | Modify | Add `trailingIcon` + `isPassword` params, internal toggle state, eye icon |
| `android-app/feature/feature-auth/src/main/java/tv/bayit/plus/feature/auth/login/LoginScreen.kt`                    | Modify | Pass `isPassword = true` to password field                                |
| `android-app/feature/feature-auth/src/main/java/tv/bayit/plus/feature/auth/register/RegisterScreen.kt`              | Modify | Pass `isPassword = true` to both password fields                          |
| `android-app/designsystem/src/test/java/tv/bayit/plus/designsystem/component/GlassTextFieldPasswordTest.kt`         | Create | Unit tests: password toggle behavior in isolation                         |
| `android-app/feature/feature-auth/src/androidTest/java/tv/bayit/plus/feature/auth/login/LoginPasswordToggleTest.kt` | Create | UI test: password toggle on live login screen                             |

---

## Chunk 1: Extend GlassTextField with Password Toggle

### Task 1: Add material-icons-extended dependency

**Files:**

- Modify: `android-app/designsystem/build.gradle.kts`

- [ ] **Step 1: Check if material-icons-extended is already present**

```bash
grep -r "material-icons-extended" android-app/designsystem/
```

Expected: no output (not yet added)

- [ ] **Step 2: Add the dependency to the `dependencies` block**

```kotlin
implementation("androidx.compose.material:material-icons-extended")
```

- [ ] **Step 3: Sync Gradle and verify**

```bash
cd android-app && ./gradlew :designsystem:dependencies | grep material-icons-extended
```

Expected: the dependency appears in output

---

### Task 2: Write failing tests for GlassTextField password toggle

**Files:**

- Create: `android-app/designsystem/src/test/java/tv/bayit/plus/designsystem/component/GlassTextFieldPasswordTest.kt`

- [ ] **Step 1: Create the test directory**

```bash
mkdir -p android-app/designsystem/src/test/java/tv/bayit/plus/designsystem/component/
```

- [ ] **Step 2: Create the test file**

```kotlin
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
```

- [ ] **Step 3: Run tests — verify they FAIL**

```bash
cd android-app && ./gradlew :designsystem:test --tests "*.GlassTextFieldPasswordTest" 2>&1 | tail -20
```

Expected: FAILED — `isPassword` parameter does not exist yet

---

### Task 3: Implement `isPassword` in GlassTextField

**Files:**

- Modify: `android-app/designsystem/src/main/java/tv/bayit/plus/designsystem/component/GlassTextField.kt`

- [ ] **Step 1: Read the full current file**

Open `android-app/designsystem/src/main/java/tv/bayit/plus/designsystem/component/GlassTextField.kt` and understand the full structure before making changes.

- [ ] **Step 2: Add imports at the top of the file (after existing imports)**

```kotlin
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.input.PasswordVisualTransformation
```

- [ ] **Step 3: Add `trailingIcon` and `isPassword` to the function signature**

Add after the existing `visualTransformation` parameter:

```kotlin
trailingIcon: @Composable (() -> Unit)? = null,
isPassword: Boolean = false,
```

- [ ] **Step 4: Add internal state and derived values inside the composable body**

Add at the top of the composable function body, before any layout code:

```kotlin
var passwordVisible by remember { mutableStateOf(false) }

val effectiveTransformation = if (isPassword && !passwordVisible) {
    PasswordVisualTransformation()
} else {
    visualTransformation
}

val effectiveTrailingIcon: @Composable (() -> Unit)? = when {
    isPassword -> {
        {
            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                Icon(
                    imageVector = if (passwordVisible) Icons.Filled.VisibilityOff
                                  else Icons.Filled.Visibility,
                    contentDescription = if (passwordVisible) "Hide password"
                                         else "Show password"
                )
            }
        }
    }
    else -> trailingIcon
}
```

- [ ] **Step 5: Wire derived values into the underlying TextField call**

Replace the existing `visualTransformation = visualTransformation` with:

```kotlin
visualTransformation = effectiveTransformation,
trailingIcon = effectiveTrailingIcon,
```

> If `trailingIcon` is not yet wired into the underlying `TextField`/`OutlinedTextField` call, add it at this step.

- [ ] **Step 6: Run the tests — verify they PASS**

```bash
cd android-app && ./gradlew :designsystem:test --tests "*.GlassTextFieldPasswordTest" 2>&1 | tail -20
```

Expected: 4 tests PASSED

- [ ] **Step 7: Commit**

```bash
git add android-app/designsystem/build.gradle.kts \
        android-app/designsystem/src/main/java/tv/bayit/plus/designsystem/component/GlassTextField.kt \
        android-app/designsystem/src/test/java/tv/bayit/plus/designsystem/component/GlassTextFieldPasswordTest.kt
git commit -m "feat(android): add isPassword toggle to GlassTextField"
```

---

## Chunk 2: Update Screens + UI Tests

### Task 4: Update LoginScreen

**Files:**

- Modify: `android-app/feature/feature-auth/src/main/java/tv/bayit/plus/feature/auth/login/LoginScreen.kt`

- [ ] **Step 1: Read the full LoginScreen.kt**

Open `android-app/feature/feature-auth/src/main/java/tv/bayit/plus/feature/auth/login/LoginScreen.kt` and locate the password `GlassTextField` call.

- [ ] **Step 2: Replace the password field with `isPassword = true`**

Find the `GlassTextField` for the password field. It will have `visualTransformation = PasswordVisualTransformation()` or similar. Replace it:

```kotlin
GlassTextField(
    value = password,
    onValueChange = { password = it },
    label = stringResource(R.string.auth_password), // keep existing label
    isPassword = true,
    // keep all other existing parameters (keyboardOptions, modifier, etc.)
    // REMOVE any manual: visualTransformation = PasswordVisualTransformation()
)
```

- [ ] **Step 3: Build to verify no compile errors**

```bash
cd android-app && ./gradlew :feature:feature-auth:assembleDebug 2>&1 | tail -20
```

Expected: BUILD SUCCESSFUL

---

### Task 5: Update RegisterScreen

**Files:**

- Modify: `android-app/feature/feature-auth/src/main/java/tv/bayit/plus/feature/auth/register/RegisterScreen.kt`

- [ ] **Step 1: Read the full RegisterScreen.kt**

Open `android-app/feature/feature-auth/src/main/java/tv/bayit/plus/feature/auth/register/RegisterScreen.kt` and locate both password fields (password + confirm password).

- [ ] **Step 2: Apply `isPassword = true` to both password fields**

Apply the same change as Task 4 to each password `GlassTextField`.

- [ ] **Step 3: Build to verify no compile errors**

```bash
cd android-app && ./gradlew :feature:feature-auth:assembleDebug 2>&1 | tail -20
```

Expected: BUILD SUCCESSFUL

---

### Task 6: Write and run UI test for login password toggle

**Files:**

- Create: `android-app/feature/feature-auth/src/androidTest/java/tv/bayit/plus/feature/auth/login/LoginPasswordToggleTest.kt`

- [ ] **Step 1: Find the Activity that hosts LoginScreen**

```bash
grep -r "LoginScreen\|LoginActivity" android-app/feature/feature-auth/src/main/AndroidManifest.xml android-app/feature/feature-auth/src/main/java/ | grep -i "activity\|setContent" | head -10
```

Note the Activity class name — you need it in Step 2.

- [ ] **Step 2: Create the androidTest directory**

```bash
mkdir -p android-app/feature/feature-auth/src/androidTest/java/tv/bayit/plus/feature/auth/login/
```

- [ ] **Step 3: Create the UI test file**

```kotlin
package tv.bayit.plus.feature.auth.login

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.performClick
import org.junit.Rule
import org.junit.Test

// Replace YourMainActivity with the Activity found in Step 1
class LoginPasswordToggleTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<YourMainActivity>()

    @Test
    fun `password field has show password icon and toggles on tap`() {
        composeTestRule
            .onNodeWithContentDescription("Show password")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithContentDescription("Show password")
            .performClick()

        composeTestRule
            .onNodeWithContentDescription("Hide password")
            .assertIsDisplayed()

        composeTestRule
            .onNodeWithContentDescription("Hide password")
            .performClick()

        composeTestRule
            .onNodeWithContentDescription("Show password")
            .assertIsDisplayed()
    }
}
```

- [ ] **Step 4: Run the UI test on an emulator**

```bash
cd android-app && ./gradlew :feature:feature-auth:connectedAndroidTest \
  --tests "*.LoginPasswordToggleTest" 2>&1 | tail -30
```

Expected: 1 test PASSED

- [ ] **Step 5: Run the full feature-auth test suite to check for regressions**

```bash
cd android-app && ./gradlew :feature:feature-auth:test :feature:feature-auth:connectedAndroidTest 2>&1 | tail -20
```

Expected: all tests PASSED

- [ ] **Step 6: Final commit**

```bash
git add android-app/feature/feature-auth/src/main/java/tv/bayit/plus/feature/auth/login/LoginScreen.kt \
        android-app/feature/feature-auth/src/main/java/tv/bayit/plus/feature/auth/register/RegisterScreen.kt \
        android-app/feature/feature-auth/src/androidTest/java/tv/bayit/plus/feature/auth/login/LoginPasswordToggleTest.kt
git commit -m "feat(android): wire password toggle on login and register screens"
```

---

## Decision Log

| Decision                                                     | Alternatives Considered                                   | Reason                                                                                                                                             |
| ------------------------------------------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add `isPassword` to `GlassTextField` component               | Wire toggle at screen level in LoginScreen/RegisterScreen | Matches iOS `GlassTextField(isSecure: true)` pattern; zero toggle logic at screen level; consistent for any future screen needing a password field |
| Use `Icons.Filled.Visibility` / `Icons.Filled.VisibilityOff` | Custom vector drawables, custom icon font                 | Material Icons Extended is idiomatic Compose; avoids adding drawable XML files to a module that has none                                           |
| Add `trailingIcon` param to `GlassTextField`                 | Keep trailing icon internal-only                          | Enables non-password use cases (search clear button, etc.) to be added later without another refactor                                              |
