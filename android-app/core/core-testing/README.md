# Core Testing Module

Testing infrastructure and utilities for Bayit+ Android app.

## Purpose

This module provides:
- Testing framework configuration (JUnit 5, MockK, Turbine)
- Test utilities and rules
- Fake implementations of repositories
- Test data factories

## Dependencies

- **JUnit 5** - Testing framework
- **MockK** - Mocking library for Kotlin
- **Turbine** - Flow testing library
- **Truth** - Fluent assertions
- **Coroutines Test** - Coroutine testing utilities

## Usage

### 1. Add dependency to your module

```kotlin
// feature-*/build.gradle.kts
dependencies {
    testImplementation(project(":core:core-testing"))
    testRuntimeOnly(libs.junit.jupiter.engine)
}
```

### 2. Use CoroutineTestRule in tests

```kotlin
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.RegisterExtension
import tv.bayit.plus.core.testing.CoroutineTestRule

class MyViewModelTest {
    @JvmField
    @RegisterExtension
    val coroutineTestRule = CoroutineTestRule()

    @Test
    fun `test async operation`() = runTest {
        // Test code here
    }
}
```

### 3. Use TestData factories

```kotlin
import tv.bayit.plus.core.testing.TestData

@Test
fun `test content loading`() {
    // Given
    val testContent = TestData.createContent(title = "My Movie")

    // When / Then
    // ...
}
```

## Testing Best Practices

1. **Use descriptive test names** with backticks
2. **Follow Given-When-Then** pattern
3. **Test one thing per test**
4. **Use test data factories** instead of manual object creation
5. **Mock external dependencies** using MockK
6. **Test Flows** using Turbine

## Example Test

```kotlin
import app.cash.turbine.test
import com.google.common.truth.Truth.assertThat
import io.mockk.*
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.RegisterExtension
import tv.bayit.plus.core.testing.*

class VodViewModelTest {

    @JvmField
    @RegisterExtension
    val coroutineTestRule = CoroutineTestRule()

    private lateinit var contentRepository: FakeContentRepository
    private lateinit var viewModel: VodViewModel

    @BeforeEach
    fun setUp() {
        contentRepository = FakeContentRepository()
        viewModel = VodViewModel(contentRepository)
    }

    @Test
    fun `loadVodContent updates state to Success when data is available`() = runTest {
        // Given
        val expectedMovies = TestData.createContentList(5)
        contentRepository.setMovies(expectedMovies)

        // When
        viewModel.loadVodContent()

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertThat(state).isInstanceOf(VodUiState.Success::class.java)
            val success = state as VodUiState.Success
            assertThat(success.movies).isEqualTo(expectedMovies)
        }
    }
}
```

## Coverage Requirements

All modules must achieve **87% test coverage** (CLAUDE.md requirement).

Use Jacoco to measure coverage:
```bash
./gradlew test jacocoTestReport
```
