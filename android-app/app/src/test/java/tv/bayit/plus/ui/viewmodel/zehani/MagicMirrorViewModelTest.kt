package tv.bayit.plus.ui.viewmodel.zehani

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import tv.bayit.plus.data.model.zehani.MagicMirrorGreeting
import tv.bayit.plus.data.repository.ZehAniRepository

@OptIn(ExperimentalCoroutinesApi::class)
class MagicMirrorViewModelTest {

    @get:Rule
    val instantExecutorRule = InstantTaskExecutorRule()

    private val testDispatcher = StandardTestDispatcher()
    private lateinit var repository: ZehAniRepository
    private lateinit var viewModel: MagicMirrorViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        repository = mockk()
        viewModel = MagicMirrorViewModel(repository)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `load greeting success updates state`() = runTest {
        val mockGreeting = MagicMirrorGreeting(
            id = "greeting-123",
            userId = "user-456",
            profileId = "profile-789",
            greetingHebrew = "בוקר טוב",
            greetingEnglish = "Good morning",
            vocabularyWord = "בוקר",
            vocabularyTranslation = "morning",
            date = "2026-02-15",
            avatarPoseUrl = null,
            audioUrl = null
        )

        coEvery { repository.getDailyGreeting("profile-789") } returns flowOf(mockGreeting)

        viewModel.loadGreeting("profile-789")
        testDispatcher.scheduler.advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state.isLoading.not())
        assertEquals(mockGreeting, state.greeting)
        assertEquals(null, state.error)
    }

    @Test
    fun `load greeting failure sets error`() = runTest {
        coEvery { repository.getDailyGreeting(any()) } throws Exception("Network error")

        viewModel.loadGreeting("profile-123")
        testDispatcher.scheduler.advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state.isLoading.not())
        assertEquals(null, state.greeting)
        assertTrue(state.error != null)
    }

    @Test
    fun `refresh greeting generates new greeting`() = runTest {
        val newGreeting = MagicMirrorGreeting(
            id = "greeting-new",
            userId = "user-456",
            profileId = "profile-789",
            greetingHebrew = "ערב טוב",
            greetingEnglish = "Good evening",
            vocabularyWord = "ערב",
            vocabularyTranslation = "evening",
            date = "2026-02-15",
            avatarPoseUrl = null,
            audioUrl = null
        )

        coEvery { repository.generateNewGreeting("profile-789") } returns flowOf(newGreeting)

        viewModel.refreshGreeting("profile-789")
        testDispatcher.scheduler.advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(newGreeting, state.greeting)
        assertEquals("ערב טוב", state.greeting?.greetingHebrew)
    }
}
