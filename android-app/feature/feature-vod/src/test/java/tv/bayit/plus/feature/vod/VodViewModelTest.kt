package tv.bayit.plus.feature.vod

import app.cash.turbine.test
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import tv.bayit.plus.core.common.logging.NoOpBayitLogger
import tv.bayit.plus.core.model.ContentCategory
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.core.testing.CoroutineTestRule
import tv.bayit.plus.core.testing.FakeCategoryRepository

/**
 * Comprehensive test suite for VodViewModel.
 *
 * Tests category loading, selection, content pagination, and error handling.
 */
@ExtendWith(CoroutineTestRule::class)
class VodViewModelTest {

    private lateinit var categoryRepository: FakeCategoryRepository
    private val logger = NoOpBayitLogger()

    private lateinit var viewModel: VodViewModel

    @BeforeEach
    fun setup() {
        categoryRepository = FakeCategoryRepository()
    }

    @AfterEach
    fun tearDown() {
        categoryRepository.clear()
    }

    @Test
    fun `initial state is Loading`() = runTest {
        val categories = listOf(
            ContentCategory(id = "cat-1", name = "Movies", nameKey = "movies")
        )
        categoryRepository.setCategories(categories)

        viewModel = VodViewModel(categoryRepository, logger)

        viewModel.uiState.test {
            val initialState = awaitItem()
            assertThat(initialState).isInstanceOf(VodUiState.Loading::class.java)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `loadCategories success - transitions to Success state`() = runTest {
        val categories = listOf(
            ContentCategory(id = "cat-1", name = "Movies", nameKey = "movies"),
            ContentCategory(id = "cat-2", name = "Series", nameKey = "series")
        )
        categoryRepository.setCategories(categories)

        val content = listOf(
            ContentItem(
                id = "content-1",
                title = "Movie 1",
                thumbnail = "poster1.jpg",
                type = "movie"
            )
        )
        categoryRepository.setContentForCategory("cat-1", 1, content)

        viewModel = VodViewModel(categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading

            val successState = awaitItem()
            assertThat(successState).isInstanceOf(VodUiState.Success::class.java)

            val state = successState as VodUiState.Success
            assertThat(state.categories).hasSize(2)
            assertThat(state.selectedCategoryId).isEqualTo("cat-1")
            assertThat(state.isLoadingContent).isTrue()

            // Wait for content to load
            val contentLoadedState = awaitItem() as VodUiState.Success
            assertThat(contentLoadedState.contentItems).hasSize(1)
            assertThat(contentLoadedState.contentItems.first().title).isEqualTo("Movie 1")
            assertThat(contentLoadedState.isLoadingContent).isFalse()

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `loadCategories error - transitions to Error state`() = runTest {
        categoryRepository.shouldReturnError = true
        categoryRepository.errorMessage = "Failed to fetch categories"

        viewModel = VodViewModel(categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading

            val errorState = awaitItem()
            assertThat(errorState).isInstanceOf(VodUiState.Error::class.java)

            val state = errorState as VodUiState.Error
            assertThat(state.message).contains("Failed to fetch categories")

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `selectCategory - loads content for selected category`() = runTest {
        val categories = listOf(
            ContentCategory(id = "cat-1", name = "Movies", nameKey = "movies"),
            ContentCategory(id = "cat-2", name = "Series", nameKey = "series")
        )
        categoryRepository.setCategories(categories)

        val moviesContent = listOf(
            ContentItem(id = "movie-1", title = "Movie 1", thumbnail = "poster1.jpg", type = "movie")
        )
        val seriesContent = listOf(
            ContentItem(id = "series-1", title = "Series 1", thumbnail = "poster2.jpg", type = "series")
        )
        categoryRepository.setContentForCategory("cat-1", 1, moviesContent)
        categoryRepository.setContentForCategory("cat-2", 1, seriesContent)

        viewModel = VodViewModel(categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading
            skipItems(1) // Skip initial Success
            skipItems(1) // Skip content loaded for cat-1

            viewModel.selectCategory("cat-2")

            val categorySelectedState = awaitItem() as VodUiState.Success
            assertThat(categorySelectedState.selectedCategoryId).isEqualTo("cat-2")
            assertThat(categorySelectedState.isLoadingContent).isTrue()

            val contentLoadedState = awaitItem() as VodUiState.Success
            assertThat(contentLoadedState.contentItems).hasSize(1)
            assertThat(contentLoadedState.contentItems.first().title).isEqualTo("Series 1")
            assertThat(contentLoadedState.isLoadingContent).isFalse()

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `refresh - reloads categories and content`() = runTest {
        val categories = listOf(
            ContentCategory(id = "cat-1", name = "Movies", nameKey = "movies")
        )
        categoryRepository.setCategories(categories)

        val content = listOf(
            ContentItem(id = "content-1", title = "Content 1", thumbnail = "poster.jpg", type = "movie")
        )
        categoryRepository.setContentForCategory("cat-1", 1, content)

        viewModel = VodViewModel(categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading
            skipItems(1) // Skip initial Success
            val initialContentState = awaitItem() as VodUiState.Success
            assertThat(initialContentState.isRefreshing).isFalse()

            viewModel.refresh()

            val refreshingState = awaitItem() as VodUiState.Success
            assertThat(refreshingState.isRefreshing).isTrue()

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `empty categories - renders success state with empty lists`() = runTest {
        categoryRepository.setCategories(emptyList())

        viewModel = VodViewModel(categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading

            val successState = awaitItem() as VodUiState.Success
            assertThat(successState.categories).isEmpty()
            assertThat(successState.selectedCategoryId).isNull()
            assertThat(successState.contentItems).isEmpty()

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `content loading error - updates state with error content`() = runTest {
        val categories = listOf(
            ContentCategory(id = "cat-1", name = "Movies", nameKey = "movies")
        )
        categoryRepository.setCategories(categories)

        viewModel = VodViewModel(categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading
            skipItems(1) // Skip categories loaded

            // Enable error for content loading
            categoryRepository.shouldReturnError = true

            val contentErrorState = awaitItem() as VodUiState.Success
            assertThat(contentErrorState.isLoadingContent).isFalse()
            assertThat(contentErrorState.contentItems).isEmpty()

            cancelAndIgnoreRemainingEvents()
        }
    }
}
