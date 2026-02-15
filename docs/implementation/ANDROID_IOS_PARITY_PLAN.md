# Android-iOS Full Parity Implementation Plan

**Date:** 2026-02-14
**Status:** Ready for Execution
**Goal:** Bring Kotlin Android app to 100% feature parity with Swift iOS app
**Current Parity:** 85/96 features (88.5%)
**Target:** 96/96 features (100%)

---

## Executive Summary

The Kotlin Android app is **missing 11 features** that exist in the Swift iOS app. This plan provides a **phased approach** to achieve full parity over **~400 hours (~10 weeks with 1 developer)**.

### Gap Analysis

| Gap Category | Features Missing | Est. Hours | Priority |
|--------------|------------------|------------|----------|
| **Testing Infrastructure** | 100 test files, 87% coverage | 200h | CRITICAL |
| **Non-AR Features** | 7 features | 120h | HIGH |
| **AR Features** | 4 features (ARCore alternatives) | 80h | MEDIUM |
| **Total** | **11 features + tests** | **400h** | - |

### Phased Approach

**Phase 1: Testing Infrastructure (CRITICAL)** - 200 hours (~5 weeks)
- Set up JUnit 5 + MockK + Turbine testing framework
- Write tests for all 60+ ViewModels
- Write tests for all repositories and services
- Achieve 87% code coverage (CLAUDE.md requirement)

**Phase 2: Non-AR Features (HIGH)** - 120 hours (~3 weeks)
- Implement 7 missing non-AR features
- Full UI/UX implementation
- Backend integration
- Feature testing

**Phase 3: AR Features (MEDIUM)** - 80 hours (~2 weeks)
- Explore ARCore alternatives to ARKit
- Implement 4 AR-based features
- Cross-platform AR solutions

---

## PHASE 1: TESTING INFRASTRUCTURE (CRITICAL)

**Duration:** 200 hours (~5 weeks)
**Priority:** CRITICAL - Must be done first
**Goal:** Achieve 87% test coverage (CLAUDE.md requirement)

### Current State
- ❌ 0 test files
- ❌ 0% coverage
- ❌ No test infrastructure
- ❌ No CI/CD test automation

### Target State
- ✅ ~100 test files
- ✅ 87% code coverage
- ✅ JUnit 5 + MockK + Turbine framework
- ✅ Automated CI/CD testing

---

### Task 1.1: Set Up Testing Framework (8 hours)

**Files to Create:**
```
android-app/
├── buildSrc/
│   └── src/main/kotlin/
│       └── TestDependencies.kt
├── core/core-testing/
│   ├── build.gradle.kts
│   └── src/main/kotlin/tv/bayit/plus/core/testing/
│       ├── CoroutineTestRule.kt
│       ├── FakeContentRepository.kt
│       ├── FakeAuthRepository.kt
│       └── TestDispatchers.kt
└── gradle/libs.versions.toml (update)
```

**Dependencies to Add:**
```kotlin
// gradle/libs.versions.toml
[versions]
junit5 = "5.10.1"
mockk = "1.13.9"
turbine = "1.0.0"
coroutines-test = "1.8.0"
truth = "1.4.0"

[libraries]
junit-jupiter-api = { module = "org.junit.jupiter:junit-jupiter-api", version.ref = "junit5" }
junit-jupiter-engine = { module = "org.junit.jupiter:junit-jupiter-engine", version.ref = "junit5" }
mockk = { module = "io.mockk:mockk", version.ref = "mockk" }
mockk-android = { module = "io.mockk:mockk-android", version.ref = "mockk" }
turbine = { module = "app.cash.turbine:turbine", version.ref = "turbine" }
coroutines-test = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-test", version.ref = "coroutines-test" }
truth = { module = "com.google.truth:truth", version.ref = "truth" }
```

**Build Configuration:**
```kotlin
// core/core-testing/build.gradle.kts
plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "tv.bayit.plus.core.testing"
    compileSdk = 34
}

dependencies {
    api(libs.junit.jupiter.api)
    api(libs.mockk)
    api(libs.turbine)
    api(libs.coroutines.test)
    api(libs.truth)
    api(libs.kotlin.test)
}
```

**Effort:** 8 hours

---

### Task 1.2: Create Test Utilities (16 hours)

**Files to Create:**

**1. CoroutineTestRule.kt** (40 lines)
```kotlin
// core/core-testing/src/main/kotlin/tv/bayit/plus/core/testing/CoroutineTestRule.kt
package tv.bayit.plus.core.testing

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.*
import org.junit.jupiter.api.extension.AfterEachCallback
import org.junit.jupiter.api.extension.BeforeEachCallback
import org.junit.jupiter.api.extension.ExtensionContext

class CoroutineTestRule(
    private val dispatcher: TestDispatcher = UnconfinedTestDispatcher()
) : BeforeEachCallback, AfterEachCallback {

    override fun beforeEach(context: ExtensionContext?) {
        Dispatchers.setMain(dispatcher)
    }

    override fun afterEach(context: ExtensionContext?) {
        Dispatchers.resetMain()
    }
}
```

**2. FakeRepositories.kt** (200 lines)
```kotlin
// core/core-testing/src/main/kotlin/tv/bayit/plus/core/testing/FakeContentRepository.kt
package tv.bayit.plus.core.testing

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import tv.bayit.plus.core.model.*

class FakeContentRepository : ContentRepository {
    private val _movies = mutableListOf<Content>()
    private val _series = mutableListOf<Content>()

    var shouldThrowError = false
    var errorMessage = "Test error"

    override fun getMovies(): Flow<List<Content>> {
        if (shouldThrowError) throw Exception(errorMessage)
        return flowOf(_movies)
    }

    override fun getSeries(): Flow<List<Content>> {
        if (shouldThrowError) throw Exception(errorMessage)
        return flowOf(_series)
    }

    fun setMovies(movies: List<Content>) {
        _movies.clear()
        _movies.addAll(movies)
    }

    fun setSeries(series: List<Content>) {
        _series.clear()
        _series.addAll(series)
    }
}

// Similar fakes for other repositories...
```

**3. TestData.kt** (150 lines)
```kotlin
// core/core-testing/src/main/kotlin/tv/bayit/plus/core/testing/TestData.kt
package tv.bayit.plus.core.testing

import tv.bayit.plus.core.model.*

object TestData {
    fun createContent(
        id: String = "test-id",
        title: String = "Test Movie",
        type: ContentType = ContentType.MOVIE
    ) = Content(
        id = id,
        title = title,
        description = "Test description",
        poster = "https://test.com/poster.jpg",
        type = type,
        rating = 8.5,
        year = 2024,
        duration = 7200,
        genres = listOf("Action", "Drama")
    )

    fun createUser(
        id: String = "user-123",
        email: String = "test@test.com"
    ) = User(
        id = id,
        email = email,
        displayName = "Test User",
        photoUrl = null
    )

    // More test data factories...
}
```

**Effort:** 16 hours

---

### Task 1.3: Write ViewModel Tests (120 hours)

**Target:** Test all ~60 ViewModels

**Estimated breakdown:**
- ~60 ViewModels × 2 hours each = 120 hours
- Each ViewModel should have 5-10 test cases

**Example Test File:**

**feature-vod/src/test/kotlin/tv/bayit/plus/feature/vod/VodViewModelTest.kt** (150 lines)
```kotlin
package tv.bayit.plus.feature.vod

import app.cash.turbine.test
import com.google.common.truth.Truth.assertThat
import io.mockk.*
import kotlinx.coroutines.flow.flowOf
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
    private lateinit var analyticsTracker: MockAnalyticsTracker
    private lateinit var viewModel: VodViewModel

    @BeforeEach
    fun setUp() {
        contentRepository = FakeContentRepository()
        analyticsTracker = MockAnalyticsTracker()
        viewModel = VodViewModel(contentRepository, analyticsTracker)
    }

    @Test
    fun `initial state is Loading`() = runTest {
        viewModel.uiState.test {
            assertThat(awaitItem()).isInstanceOf(VodUiState.Loading::class.java)
        }
    }

    @Test
    fun `loadVodContent updates state to Success when data is available`() = runTest {
        // Given
        val expectedMovies = listOf(TestData.createContent(type = ContentType.MOVIE))
        val expectedSeries = listOf(TestData.createContent(type = ContentType.SERIES))
        contentRepository.setMovies(expectedMovies)
        contentRepository.setSeries(expectedSeries)

        // When
        viewModel.loadVodContent()

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertThat(state).isInstanceOf(VodUiState.Success::class.java)
            val success = state as VodUiState.Success
            assertThat(success.movies).isEqualTo(expectedMovies)
            assertThat(success.series).isEqualTo(expectedSeries)
        }
    }

    @Test
    fun `loadVodContent updates state to Error when repository throws exception`() = runTest {
        // Given
        val errorMessage = "Network error"
        contentRepository.shouldThrowError = true
        contentRepository.errorMessage = errorMessage

        // When
        viewModel.loadVodContent()

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertThat(state).isInstanceOf(VodUiState.Error::class.java)
            val error = state as VodUiState.Error
            assertThat(error.message).contains(errorMessage)
        }
    }

    @Test
    fun `loadVodContent tracks analytics events`() = runTest {
        // Given
        contentRepository.setMovies(listOf(TestData.createContent()))
        contentRepository.setSeries(listOf(TestData.createContent()))

        // When
        viewModel.loadVodContent()

        // Then
        assertThat(analyticsTracker.trackedScreens).contains("vod_loaded")
    }

    @Test
    fun `retry after error loads content successfully`() = runTest {
        // Given
        contentRepository.shouldThrowError = true
        viewModel.loadVodContent()

        // When
        contentRepository.shouldThrowError = false
        contentRepository.setMovies(listOf(TestData.createContent()))
        viewModel.retry()

        // Then
        viewModel.uiState.test {
            val state = awaitItem()
            assertThat(state).isInstanceOf(VodUiState.Success::class.java)
        }
    }

    // More test cases...
}
```

**Priority ViewModels to Test (first 20):**
1. HomeViewModel
2. LiveTVViewModel
3. VODViewModel
4. MovieDetailViewModel
5. SeriesDetailViewModel
6. PlayerViewModel
7. PodcastsViewModel
8. PodcastDetailViewModel
9. AudiobooksViewModel
10. AudiobookDetailViewModel
11. RadioViewModel
12. SearchViewModel
13. LLMSearchViewModel
14. ProfileViewModel
15. SettingsViewModel
16. DownloadsViewModel
17. RewardsViewModel
18. BetaCreditsViewModel
19. TriviaViewModel
20. WatchPartyViewModel

**Effort:** 120 hours (60 ViewModels × 2 hours each)

---

### Task 1.4: Write Repository Tests (40 hours)

**Target:** Test all repositories in core-data

**Example:**

**core/core-data/src/test/kotlin/tv/bayit/plus/core/data/ContentRepositoryTest.kt** (200 lines)
```kotlin
package tv.bayit.plus.core.data

import app.cash.turbine.test
import com.google.common.truth.Truth.assertThat
import io.mockk.*
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import tv.bayit.plus.core.network.ApiService
import tv.bayit.plus.core.database.ContentDao
import tv.bayit.plus.core.testing.*

class ContentRepositoryTest {

    private lateinit var apiService: ApiService
    private lateinit var contentDao: ContentDao
    private lateinit var repository: ContentRepository

    @BeforeEach
    fun setUp() {
        apiService = mockk()
        contentDao = mockk()
        repository = ContentRepositoryImpl(apiService, contentDao)
    }

    @Test
    fun `getMovies returns cached data when network fails`() = runTest {
        // Given
        val cachedMovies = listOf(TestData.createContent())
        coEvery { apiService.getMovies() } throws Exception("Network error")
        coEvery { contentDao.getMovies() } returns flowOf(cachedMovies.map { it.toEntity() })

        // When
        val result = repository.getMovies()

        // Then
        result.test {
            val movies = awaitItem()
            assertThat(movies).hasSize(1)
            assertThat(movies[0].id).isEqualTo(cachedMovies[0].id)
            awaitComplete()
        }
    }

    @Test
    fun `getMovies updates cache when network succeeds`() = runTest {
        // Given
        val networkMovies = listOf(TestData.createContent())
        coEvery { apiService.getMovies() } returns networkMovies
        coEvery { contentDao.insertMovies(any()) } just Runs

        // When
        repository.getMovies().test {
            awaitItem()
        }

        // Then
        coVerify { contentDao.insertMovies(any()) }
    }

    // More test cases...
}
```

**Repositories to Test:**
1. ContentRepository
2. AuthRepository
3. LiveTVRepository
4. PodcastRepository
5. AudiobookRepository
6. RadioRepository
7. SearchRepository
8. ProfileRepository
9. DownloadsRepository
10. FavoritesRepository

**Effort:** 40 hours (10 repositories × 4 hours each)

---

### Task 1.5: Write Service Tests (16 hours)

**Target:** Test core services

**Services to Test:**
1. Analytics service
2. Auth service
3. Media playback service
4. Network service
5. Database service

**Effort:** 16 hours (5 services × 3 hours each)

---

### Task 1.6: Configure CI/CD Testing (8 hours)

**Files to Create/Update:**

**.github/workflows/android-tests.yml** (100 lines)
```yaml
name: Android Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Cache Gradle packages
        uses: actions/cache@v3
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}

      - name: Grant execute permission for gradlew
        run: chmod +x gradlew

      - name: Run tests
        run: ./gradlew test --stacktrace

      - name: Generate coverage report
        run: ./gradlew jacocoTestReport

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./build/reports/jacoco/test/jacocoTestReport.xml
          fail_ci_if_error: true
          verbose: true

      - name: Verify minimum coverage
        run: |
          COVERAGE=$(grep -oP '(?<=<counter type="INSTRUCTION" missed=")[^"]*' build/reports/jacoco/test/jacocoTestReport.xml | awk '{sum+=$1} END {print 100-sum/NR}')
          echo "Coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 87" | bc -l) )); then
            echo "Coverage $COVERAGE% is below required 87%"
            exit 1
          fi
```

**build.gradle.kts (root):**
```kotlin
plugins {
    alias(libs.plugins.jacoco)
}

jacoco {
    toolVersion = "0.8.11"
}

tasks.register("jacocoTestReport", JacocoReport::class) {
    dependsOn(":app:test")

    reports {
        xml.required.set(true)
        html.required.set(true)
    }

    classDirectories.setFrom(
        fileTree("app/build/tmp/kotlin-classes/debug")
    )

    sourceDirectories.setFrom(
        files("app/src/main/java", "app/src/main/kotlin")
    )

    executionData.setFrom(
        fileTree(".") {
            include("**/jacoco/*.exec")
        }
    )
}
```

**Effort:** 8 hours

---

### Phase 1 Summary

| Task | Hours | Priority |
|------|-------|----------|
| 1.1 Set Up Testing Framework | 8h | CRITICAL |
| 1.2 Create Test Utilities | 16h | CRITICAL |
| 1.3 Write ViewModel Tests (60) | 120h | CRITICAL |
| 1.4 Write Repository Tests (10) | 40h | CRITICAL |
| 1.5 Write Service Tests (5) | 16h | HIGH |
| 1.6 Configure CI/CD Testing | 8h | HIGH |
| **TOTAL** | **208h** | - |

**Deliverables:**
- ✅ ~100 test files
- ✅ 87%+ code coverage
- ✅ JUnit 5 + MockK + Turbine framework
- ✅ Automated CI/CD pipeline
- ✅ CLAUDE.md compliance

---

## PHASE 2: NON-AR FEATURES (HIGH PRIORITY)

**Duration:** 120 hours (~3 weeks)
**Priority:** HIGH
**Goal:** Implement 7 missing non-AR features

### Missing Features

| Feature | Complexity | Hours | Priority |
|---------|-----------|-------|----------|
| 1. Grandparent Bridge | Medium | 20h | HIGH |
| 2. Family Controls | High | 24h | HIGH |
| 3. Flows | Medium | 16h | MEDIUM |
| 4. Help & Support | Low | 12h | MEDIUM |
| 5. Morning Ritual | Medium | 16h | MEDIUM |
| 6. Star Story | High | 20h | MEDIUM |
| 7. Subscription Management | Medium | 12h | HIGH |

**Total:** 120 hours

---

### Feature 2.1: Grandparent Bridge (20 hours)

**Description:** Intergenerational connection feature allowing grandparents to connect with grandchildren through shared content viewing and messaging.

**Files to Create:**

```
feature/feature-social/src/main/java/tv/bayit/plus/feature/social/grandparent/
├── GrandparentBridgeScreen.kt          (200 lines)
├── GrandparentBridgeViewModel.kt       (150 lines)
├── InviteGrandparentScreen.kt          (120 lines)
├── SharedMomentsScreen.kt              (180 lines)
└── GrandparentCallScreen.kt            (150 lines)

core/core-model/src/main/java/tv/bayit/plus/core/model/
└── GrandparentModels.kt                (100 lines)

core/core-data/src/main/java/tv/bayit/plus/core/data/repository/
└── GrandparentRepository.kt            (120 lines)
```

**Implementation Details:**

**GrandparentBridgeScreen.kt** (200 lines)
```kotlin
package tv.bayit.plus.feature.social.grandparent

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.designsystem.component.*

@Composable
fun GrandparentBridgeScreen(
    viewModel: GrandparentBridgeViewModel = hiltViewModel(),
    onNavigateToInvite: () -> Unit,
    onNavigateToSharedMoments: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxSize()) {
        GlassTopBar(title = "Grandparent Bridge")

        when (val state = uiState) {
            is GrandparentBridgeUiState.Loading -> GlassLoadingIndicator()
            is GrandparentBridgeUiState.Success -> {
                LazyColumn {
                    // Connected grandparents list
                    item {
                        GlassCard {
                            Text("Connected Grandparents")
                            state.connections.forEach { connection ->
                                GrandparentConnectionCard(
                                    connection = connection,
                                    onCall = { viewModel.initiateCall(connection.id) },
                                    onMessage = { viewModel.sendMessage(connection.id) }
                                )
                            }
                        }
                    }

                    // Shared moments
                    item {
                        GlassButton(
                            text = "Shared Moments",
                            onClick = onNavigateToSharedMoments
                        )
                    }

                    // Invite button
                    item {
                        GlassButton(
                            text = "Invite Grandparent",
                            onClick = onNavigateToInvite
                        )
                    }
                }
            }
            is GrandparentBridgeUiState.Error -> ErrorView(state.message)
        }
    }
}
```

**Backend Integration:**
- GET `/api/v1/grandparent/connections` - Get connected grandparents
- POST `/api/v1/grandparent/invite` - Invite grandparent
- POST `/api/v1/grandparent/call` - Initiate video call
- GET `/api/v1/grandparent/shared-moments` - Get shared viewing moments

**Effort:** 20 hours

---

### Feature 2.2: Family Controls (24 hours)

**Description:** Parental controls for managing children's content access, screen time limits, and viewing restrictions.

**Files to Create:**

```
feature/feature-family-controls/
├── build.gradle.kts
└── src/main/java/tv/bayit/plus/feature/familycontrols/
    ├── FamilyControlsScreen.kt         (250 lines)
    ├── FamilyControlsViewModel.kt      (200 lines)
    ├── ChildProfileScreen.kt           (180 lines)
    ├── ScreenTimeLimitScreen.kt        (150 lines)
    ├── ContentRestrictionsScreen.kt    (180 lines)
    └── ViewingScheduleScreen.kt        (150 lines)

core/core-model/src/main/java/tv/bayit/plus/core/model/
└── FamilyControlsModels.kt             (150 lines)

core/core-data/src/main/java/tv/bayit/plus/core/data/repository/
└── FamilyControlsRepository.kt         (180 lines)
```

**Implementation Details:**

**FamilyControlsScreen.kt** (250 lines)
```kotlin
package tv.bayit.plus.feature.familycontrols

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.hilt.navigation.compose.hiltViewModel
import tv.bayit.plus.designsystem.component.*

@Composable
fun FamilyControlsScreen(
    viewModel: FamilyControlsViewModel = hiltViewModel(),
    onNavigateToChildProfile: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxSize()) {
        GlassTopBar(title = "Family Controls")

        when (val state = uiState) {
            is FamilyControlsUiState.Loading -> GlassLoadingIndicator()
            is FamilyControlsUiState.Success -> {
                LazyColumn {
                    // Child profiles
                    item {
                        Text("Child Profiles", style = MaterialTheme.typography.headlineSmall)
                        state.childProfiles.forEach { profile ->
                            ChildProfileCard(
                                profile = profile,
                                onClick = { onNavigateToChildProfile(profile.id) }
                            )
                        }
                    }

                    // Screen time settings
                    item {
                        GlassCard {
                            Text("Screen Time Limits")
                            ScreenTimeLimitControls(
                                limits = state.screenTimeLimits,
                                onUpdateLimit = viewModel::updateScreenTimeLimit
                            )
                        }
                    }

                    // Content restrictions
                    item {
                        GlassCard {
                            Text("Content Restrictions")
                            ContentRestrictionControls(
                                restrictions = state.contentRestrictions,
                                onUpdateRestriction = viewModel::updateContentRestriction
                            )
                        }
                    }

                    // Viewing schedule
                    item {
                        GlassCard {
                            Text("Viewing Schedule")
                            ViewingScheduleControls(
                                schedule = state.viewingSchedule,
                                onUpdateSchedule = viewModel::updateViewingSchedule
                            )
                        }
                    }
                }
            }
            is FamilyControlsUiState.Error -> ErrorView(state.message)
        }
    }
}
```

**Features:**
- Child profile management
- Screen time limits (daily/weekly)
- Content age restrictions
- Viewing schedule (allowed hours)
- Activity reports

**Backend Integration:**
- GET `/api/v1/family/profiles` - Get child profiles
- POST `/api/v1/family/profiles` - Create child profile
- PUT `/api/v1/family/screen-time-limit` - Update limits
- PUT `/api/v1/family/content-restrictions` - Update restrictions
- GET `/api/v1/family/activity-report` - Get viewing activity

**Effort:** 24 hours

---

### Feature 2.3: Flows (16 hours)

**Description:** Guided content journeys and curated playlists for thematic viewing experiences.

**Files to Create:**

```
feature/feature-flows/
├── build.gradle.kts
└── src/main/java/tv/bayit/plus/feature/flows/
    ├── FlowsScreen.kt                  (200 lines)
    ├── FlowsViewModel.kt               (150 lines)
    ├── FlowDetailScreen.kt             (180 lines)
    └── FlowProgressScreen.kt           (120 lines)

core/core-model/src/main/java/tv/bayit/plus/core/model/
└── FlowModels.kt                       (100 lines)
```

**Effort:** 16 hours

---

### Feature 2.4: Help & Support (12 hours)

**Description:** In-app help center with FAQ, tutorials, and contact support.

**Files to Create:**

```
feature/feature-help/
├── build.gradle.kts
└── src/main/java/tv/bayit/plus/feature/help/
    ├── HelpScreen.kt                   (150 lines)
    ├── HelpViewModel.kt                (100 lines)
    ├── FAQScreen.kt                    (120 lines)
    ├── ContactSupportScreen.kt         (100 lines)
    └── TutorialsScreen.kt              (120 lines)
```

**Effort:** 12 hours

---

### Feature 2.5: Morning Ritual (16 hours)

**Description:** Daily morning content flow with personalized recommendations.

**Files to Create:**

```
feature/feature-morning-ritual/
├── build.gradle.kts
└── src/main/java/tv/bayit/plus/feature/morningritual/
    ├── MorningRitualScreen.kt          (200 lines)
    ├── MorningRitualViewModel.kt       (150 lines)
    └── RitualPreferencesScreen.kt      (120 lines)
```

**Effort:** 16 hours

---

### Feature 2.6: Star Story (20 hours)

**Description:** AI-generated personalized stories for children.

**Files to Create:**

```
feature/feature-star-story/
├── build.gradle.kts
└── src/main/java/tv/bayit/plus/feature/starstory/
    ├── StarStoryScreen.kt              (220 lines)
    ├── StarStoryViewModel.kt           (180 lines)
    ├── StoryPlayerScreen.kt            (200 lines)
    └── StoryCreationScreen.kt          (150 lines)

core/core-ai/
└── src/main/java/tv/bayit/plus/core/ai/
    └── StoryGenerationService.kt       (200 lines)
```

**Effort:** 20 hours

---

### Feature 2.7: Subscription Management (12 hours)

**Description:** In-app subscription management UI.

**Files to Create:**

```
feature/feature-subscription/
├── build.gradle.kts
└── src/main/java/tv/bayit/plus/feature/subscription/
    ├── SubscriptionScreen.kt           (180 lines)
    ├── SubscriptionViewModel.kt        (150 lines)
    ├── PlanSelectionScreen.kt          (150 lines)
    └── BillingHistoryScreen.kt         (120 lines)
```

**Effort:** 12 hours

---

### Phase 2 Summary

| Feature | Hours | Files | Backend |
|---------|-------|-------|---------|
| Grandparent Bridge | 20h | 6 files | 4 endpoints |
| Family Controls | 24h | 8 files | 5 endpoints |
| Flows | 16h | 5 files | 3 endpoints |
| Help & Support | 12h | 5 files | 2 endpoints |
| Morning Ritual | 16h | 3 files | 2 endpoints |
| Star Story | 20h | 5 files | AI service |
| Subscription Management | 12h | 4 files | Stripe integration |
| **TOTAL** | **120h** | **36 files** | **16+ endpoints** |

**Deliverables:**
- ✅ 7 new feature modules
- ✅ Full UI/UX implementation
- ✅ Backend integration
- ✅ Feature tests for each module

---

## PHASE 3: AR FEATURES (MEDIUM PRIORITY)

**Duration:** 80 hours (~2 weeks)
**Priority:** MEDIUM
**Goal:** Implement ARCore alternatives to ARKit features

### Missing AR Features

| Feature | iOS Implementation | Android Alternative | Hours |
|---------|-------------------|---------------------|-------|
| 1. Avatar Creation | ARKit face capture | ARCore Face API + ML Kit | 24h |
| 2. Magic Mirror | ARKit AR effects | ARCore Augmented Faces | 20h |
| 3. Phonetic Mirror | ARKit + Speech | ARCore + Speech Recognition | 20h |
| 4. Interactive Missions | ARKit AR games | ARCore Sceneform | 16h |

**Total:** 80 hours

---

### Feature 3.1: Avatar Creation (24 hours)

**iOS Implementation:**
- Uses ARKit for 3D face capture
- Generates 3D mesh from face scan
- Customizes avatar appearance

**Android Alternative:**
- **ARCore Face API** - Face tracking and mesh generation
- **ML Kit Face Detection** - Facial features detection
- **3D mesh generation** - Convert face data to 3D model

**Files to Create:**

```
feature/feature-avatar/
├── build.gradle.kts
└── src/main/java/tv/bayit/plus/feature/avatar/
    ├── AvatarCreationScreen.kt         (250 lines)
    ├── AvatarCreationViewModel.kt      (200 lines)
    ├── ARFaceCaptureView.kt            (300 lines) - ARCore integration
    ├── FaceMeshGenerator.kt            (200 lines)
    ├── AvatarCustomizationScreen.kt    (220 lines)
    └── Avatar3DPreviewView.kt          (180 lines)

core/core-ar/
└── src/main/java/tv/bayit/plus/core/ar/
    ├── ARCoreSessionManager.kt         (150 lines)
    ├── FaceTrackingService.kt          (200 lines)
    └── MeshGenerationService.kt        (180 lines)
```

**Dependencies:**
```kotlin
// app/build.gradle.kts
dependencies {
    implementation("com.google.ar:core:1.42.0")
    implementation("com.google.ar.sceneform:core:1.17.1")
    implementation("com.google.mlkit:face-detection:16.1.6")
}
```

**Implementation:**

**ARFaceCaptureView.kt** (300 lines)
```kotlin
package tv.bayit.plus.feature.avatar

import android.content.Context
import android.util.AttributeSet
import android.view.SurfaceView
import com.google.ar.core.*
import com.google.ar.sceneform.ux.ArFragment
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

class ARFaceCaptureView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : SurfaceView(context, attrs) {

    private var arSession: Session? = null
    private val _faceMeshData = MutableStateFlow<FaceMeshData?>(null)
    val faceMeshData: StateFlow<FaceMeshData?> = _faceMeshData

    fun startCapture() {
        arSession = Session(context, setOf(Session.Feature.FRONT_CAMERA)).apply {
            configure(
                Config(this).apply {
                    augmentedFaceMode = Config.AugmentedFaceMode.MESH3D
                }
            )
            resume()
        }

        startFrameProcessing()
    }

    private fun startFrameProcessing() {
        // Process AR frames and extract face mesh
        arSession?.update()?.let { frame ->
            frame.getUpdatedTrackables(AugmentedFace::class.java).forEach { face ->
                if (face.trackingState == TrackingState.TRACKING) {
                    val meshData = extractFaceMesh(face)
                    _faceMeshData.value = meshData
                }
            }
        }
    }

    private fun extractFaceMesh(face: AugmentedFace): FaceMeshData {
        // Extract vertices, normals, and texture coordinates
        return FaceMeshData(
            vertices = face.meshVertices.toList(),
            normals = face.meshNormals.toList(),
            textureCoordinates = face.meshTextureCoordinates.toList(),
            triangleIndices = face.meshTriangleIndices.toList()
        )
    }

    fun stopCapture() {
        arSession?.pause()
        arSession?.close()
        arSession = null
    }
}

data class FaceMeshData(
    val vertices: List<Float>,
    val normals: List<Float>,
    val textureCoordinates: List<Float>,
    val triangleIndices: List<Int>
)
```

**Effort:** 24 hours

---

### Feature 3.2: Magic Mirror (20 hours)

**iOS Implementation:**
- ARKit AR effects on face
- Real-time filters and masks

**Android Alternative:**
- ARCore Augmented Faces
- Real-time AR face effects

**Files to Create:**

```
feature/feature-magic-mirror/
├── build.gradle.kts
└── src/main/java/tv/bayit/plus/feature/magicmirror/
    ├── MagicMirrorScreen.kt            (220 lines)
    ├── MagicMirrorViewModel.kt         (180 lines)
    ├── ARFaceEffectsView.kt            (280 lines)
    └── EffectSelectionPanel.kt         (150 lines)
```

**Effort:** 20 hours

---

### Feature 3.3: Phonetic Mirror (20 hours)

**iOS Implementation:**
- ARKit + Speech framework
- Pronunciation practice with visual feedback

**Android Alternative:**
- ARCore + Android Speech Recognition
- Visual pronunciation feedback

**Files to Create:**

```
feature/feature-phonetic-mirror/
├── build.gradle.kts
└── src/main/java/tv/bayit/plus/feature/phoneticmirror/
    ├── PhoneticMirrorScreen.kt         (240 lines)
    ├── PhoneticMirrorViewModel.kt      (200 lines)
    ├── PronunciationAnalyzer.kt        (180 lines)
    └── VisualFeedbackView.kt           (150 lines)

core/core-speech/
└── src/main/java/tv/bayit/plus/core/speech/
    └── SpeechRecognitionService.kt     (200 lines)
```

**Effort:** 20 hours

---

### Feature 3.4: Interactive Missions (16 hours)

**iOS Implementation:**
- ARKit AR game experiences

**Android Alternative:**
- ARCore Sceneform AR games

**Files to Create:**

```
feature/feature-interactive-missions/
├── build.gradle.kts
└── src/main/java/tv/bayit/plus/feature/interactivemissions/
    ├── InteractiveMissionScreen.kt     (220 lines)
    ├── InteractiveMissionViewModel.kt  (180 lines)
    ├── ARMissionView.kt                (260 lines)
    └── MissionProgressTracker.kt       (120 lines)
```

**Effort:** 16 hours

---

### Phase 3 Summary

| Feature | Hours | Technology | Complexity |
|---------|-------|------------|------------|
| Avatar Creation | 24h | ARCore + ML Kit | High |
| Magic Mirror | 20h | ARCore Augmented Faces | Medium |
| Phonetic Mirror | 20h | ARCore + Speech | Medium |
| Interactive Missions | 16h | ARCore Sceneform | Medium |
| **TOTAL** | **80h** | - | - |

**Dependencies:**
- ARCore 1.42.0+
- Sceneform 1.17.1+
- ML Kit Face Detection 16.1.6+
- Android Speech Recognition API

**Deliverables:**
- ✅ 4 AR feature modules
- ✅ ARCore integration
- ✅ Full parity with iOS AR features

---

## IMPLEMENTATION TIMELINE

### 10-Week Plan (1 Developer)

| Week | Phase | Tasks | Hours | Cumulative |
|------|-------|-------|-------|------------|
| **Week 1-2** | Phase 1 | Testing Framework + Utilities | 24h | 24h |
| **Week 3-6** | Phase 1 | ViewModel Tests (60) | 120h | 144h |
| **Week 7-8** | Phase 1 | Repository/Service Tests + CI/CD | 64h | 208h |
| **Week 9** | Phase 2 | Grandparent Bridge + Family Controls | 44h | 252h |
| **Week 10** | Phase 2 | Flows + Help + Morning Ritual | 44h | 296h |
| **Week 11** | Phase 2 | Star Story + Subscription | 32h | 328h |
| **Week 12-13** | Phase 3 | Avatar Creation + Magic Mirror | 44h | 372h |
| **Week 14** | Phase 3 | Phonetic Mirror + Interactive Missions | 36h | 408h |

**Total: 408 hours (~10 weeks with 1 developer at 40h/week)**

### 5-Week Plan (2 Developers)

| Week | Developer 1 | Developer 2 | Hours |
|------|------------|-------------|-------|
| **Week 1** | Testing Framework + Utilities | Non-AR Features 1-3 | 88h |
| **Week 2-3** | ViewModel Tests (30) | Non-AR Features 4-7 | 136h |
| **Week 4-5** | ViewModel Tests (30) + Repo Tests | AR Features 1-2 | 120h |
| **Week 6** | Service Tests + CI/CD | AR Features 3-4 | 64h |

**Total: 408 hours (~5 weeks with 2 developers)**

---

## TESTING REQUIREMENTS

### Test Coverage Targets

| Module | Target Coverage | Test Files | Priority |
|--------|----------------|------------|----------|
| **Core modules** | 90% | ~30 | CRITICAL |
| **Feature modules** | 85% | ~70 | HIGH |
| **Design system** | 80% | ~10 | MEDIUM |
| **Overall** | **87%** | **~110** | **REQUIRED** |

### Test Types

1. **Unit Tests** (150 files)
   - ViewModels (60 files)
   - Repositories (10 files)
   - Services (5 files)
   - Use cases (30 files)
   - Utilities (45 files)

2. **Integration Tests** (30 files)
   - Repository + API integration
   - Database integration
   - Service integration

3. **UI Tests** (20 files)
   - Screen navigation
   - User flows
   - Component interactions

**Total: ~200 test files for 87% coverage**

---

## DEPENDENCIES & PREREQUISITES

### Required Tools & Libraries

**Testing:**
- JUnit 5 (5.10.1+)
- MockK (1.13.9+)
- Turbine (1.0.0+)
- Truth (1.4.0+)
- Coroutines Test (1.8.0+)

**AR Features:**
- ARCore (1.42.0+)
- Sceneform (1.17.1+)
- ML Kit Face Detection (16.1.6+)

**AI Features:**
- OpenAI API (for Star Story)
- Google Cloud Speech API (for Phonetic Mirror)

### Backend Requirements

**New Endpoints Needed:**

Phase 2 - Non-AR Features:
- 4 endpoints for Grandparent Bridge
- 5 endpoints for Family Controls
- 3 endpoints for Flows
- 2 endpoints for Help & Support
- 2 endpoints for Morning Ritual
- AI service for Star Story
- Stripe integration for Subscription

**Total: ~16 new backend endpoints**

---

## RISK ASSESSMENT

### Critical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **ARCore limitations** | Medium | High | Prototype AR features first, have fallback plans |
| **Test coverage not reaching 87%** | Low | High | Start with core modules, prioritize critical paths |
| **Backend API delays** | Medium | Medium | Mock data for parallel development |
| **AR performance issues** | Medium | Medium | Optimize early, test on low-end devices |

### Technical Challenges

1. **ARCore vs ARKit differences**
   - ARCore has fewer features than ARKit
   - Some iOS AR features may need creative alternatives
   - Solution: Research ARCore capabilities upfront

2. **Test infrastructure complexity**
   - Multi-module testing can be complex
   - Solution: Create reusable test utilities early

3. **Performance on low-end devices**
   - AR features are resource-intensive
   - Solution: Graceful degradation for older devices

---

## SUCCESS CRITERIA

### Phase 1 (Testing)
- ✅ 87%+ test coverage
- ✅ All ViewModels tested (60+)
- ✅ All repositories tested (10+)
- ✅ CI/CD pipeline passing
- ✅ CLAUDE.md compliance (87% requirement)

### Phase 2 (Non-AR Features)
- ✅ 7 features fully implemented
- ✅ Full UI/UX matching iOS design
- ✅ Backend integration complete
- ✅ Feature tests passing

### Phase 3 (AR Features)
- ✅ 4 AR features implemented
- ✅ ARCore integration working
- ✅ Performance acceptable on mid-range devices
- ✅ Feature parity with iOS AR features

### Overall Success
- ✅ **100% feature parity** with iOS (96/96 features)
- ✅ **87%+ test coverage** (CLAUDE.md requirement)
- ✅ **All CI/CD checks passing**
- ✅ **No CLAUDE.md violations**
- ✅ **Production-ready code quality**

---

## NEXT STEPS

**Immediate Actions:**

1. **Get approval for this plan** (stakeholder sign-off)
2. **Assign developer(s)** (1-2 developers recommended)
3. **Set up project tracking** (Jira/Linear tasks)
4. **Schedule weekly reviews** (progress tracking)
5. **Begin Phase 1, Task 1.1** (Testing Framework setup)

**Week 1 Sprint:**
1. Set up JUnit 5 + MockK + Turbine
2. Create core-testing module
3. Write test utilities (CoroutineTestRule, Fakes)
4. Write first 10 ViewModel tests
5. Configure basic CI/CD

**Ready to begin? Confirm and I'll start with Phase 1, Task 1.1: Testing Framework Setup.**

---

**Document Status:** Ready for Execution
**Total Effort:** 408 hours (~10 weeks with 1 dev, ~5 weeks with 2 devs)
**Priority:** CRITICAL (Phase 1), HIGH (Phase 2), MEDIUM (Phase 3)
**Dependencies:** Backend endpoints, ARCore libraries, AI services
**Success Target:** 100% feature parity (96/96 features) + 87% test coverage
