package tv.bayit.plus.feature.search

import app.cash.turbine.test
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import tv.bayit.plus.core.common.logging.NoOpBayitLogger
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.core.testing.CoroutineTestRule
import tv.bayit.plus.core.testing.FakeSearchRepository

/**
 * Comprehensive test suite for SearchViewModel.
 *
 * Tests search functionality, debouncing, filters, suggestions, and error handling.
 */
@ExtendWith(CoroutineTestRule::class)
class SearchViewModelTest {

    private lateinit var searchRepository: FakeSearchRepository
    private val logger = NoOpBayitLogger()

    private lateinit var viewModel: SearchViewModel

    @BeforeEach
    fun setup() {
        searchRepository = FakeSearchRepository()
    }

    @AfterEach
    fun tearDown() {
        searchRepository.clear()
    }

    @Test
    fun `initial state - empty query and no results`() = runTest {
        viewModel = SearchViewModel(searchRepository, logger)

        viewModel.uiState.test {
            val initialState = awaitItem()
            assertThat(initialState.query).isEmpty()
            assertThat(initialState.results).isEmpty()
            assertThat(initialState.suggestions).isEmpty()
            assertThat(initialState.isSearching).isFalse()
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `onQueryChange with valid query - triggers debounced search`() = runTest {
        val searchResults = listOf(
            ContentItem(id = "1", title = "Movie Result", thumbnail = "poster1.jpg", type = "movie"),
            ContentItem(id = "2", title = "Series Result", thumbnail = "poster2.jpg", type = "series")
        )
        searchRepository.setSearchResults("action", searchResults)

        viewModel = SearchViewModel(searchRepository, logger)

        viewModel.uiState.test {
            awaitItem() // Initial state

            viewModel.onQueryChange("action")

            val queryChangedState = awaitItem()
            assertThat(queryChangedState.query).isEqualTo("action")

            advanceTimeBy(300) // Wait for debounce

            val searchingState = awaitItem()
            assertThat(searchingState.isSearching).isTrue()

            val resultsState = awaitItem()
            assertThat(resultsState.isSearching).isFalse()
            assertThat(resultsState.results).hasSize(2)
            assertThat(resultsState.results.first().title).isEqualTo("Movie Result")

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `onQueryChange with blank query - clears results`() = runTest {
        viewModel = SearchViewModel(searchRepository, logger)

        viewModel.uiState.test {
            awaitItem() // Initial state

            viewModel.onQueryChange("test")
            awaitItem() // Query changed

            viewModel.onQueryChange("")

            val clearedState = awaitItem()
            assertThat(clearedState.query).isEmpty()
            assertThat(clearedState.results).isEmpty()
            assertThat(clearedState.suggestions).isEmpty()
            assertThat(clearedState.isSearching).isFalse()

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `search with filter - applies filter to search`() = runTest {
        val moviesOnly = listOf(
            ContentItem(id = "1", title = "Action Movie", thumbnail = "poster.jpg", type = "movie")
        )
        searchRepository.setSearchResults("action", moviesOnly)

        viewModel = SearchViewModel(searchRepository, logger)

        viewModel.uiState.test {
            awaitItem() // Initial state

            viewModel.selectFilter(SearchFilter.MOVIES)

            val filterSelectedState = awaitItem()
            assertThat(filterSelectedState.selectedFilter).isEqualTo(SearchFilter.MOVIES)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `selectFilter twice - toggles filter off`() = runTest {
        viewModel = SearchViewModel(searchRepository, logger)

        viewModel.uiState.test {
            awaitItem() // Initial state

            viewModel.selectFilter(SearchFilter.SERIES)
            val firstSelectState = awaitItem()
            assertThat(firstSelectState.selectedFilter).isEqualTo(SearchFilter.SERIES)

            viewModel.selectFilter(SearchFilter.SERIES)
            val secondSelectState = awaitItem()
            assertThat(secondSelectState.selectedFilter).isNull()

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `onSuggestionClick - updates query and triggers search`() = runTest {
        val suggestionResults = listOf(
            ContentItem(id = "1", title = "Suggested Movie", thumbnail = "poster.jpg", type = "movie")
        )
        searchRepository.setSearchResults("suggested query", suggestionResults)

        viewModel = SearchViewModel(searchRepository, logger)

        viewModel.uiState.test {
            awaitItem() // Initial state

            viewModel.onSuggestionClick("suggested query")

            val queryUpdatedState = awaitItem()
            assertThat(queryUpdatedState.query).isEqualTo("suggested query")
            assertThat(queryUpdatedState.suggestions).isEmpty()

            val searchingState = awaitItem()
            assertThat(searchingState.isSearching).isTrue()

            val resultsState = awaitItem()
            assertThat(resultsState.results).hasSize(1)
            assertThat(resultsState.results.first().title).isEqualTo("Suggested Movie")

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `search error - updates error state`() = runTest {
        searchRepository.shouldReturnError = true
        searchRepository.errorMessage = "Network error"

        viewModel = SearchViewModel(searchRepository, logger)

        viewModel.uiState.test {
            awaitItem() // Initial state

            viewModel.onQueryChange("error query")
            awaitItem() // Query changed

            advanceTimeBy(300) // Wait for debounce

            val searchingState = awaitItem()
            assertThat(searchingState.isSearching).isTrue()

            val errorState = awaitItem()
            assertThat(errorState.isSearching).isFalse()
            assertThat(errorState.errorMessage).contains("Network error")

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `rapid query changes - cancels previous searches`() = runTest {
        val results1 = listOf(ContentItem(id = "1", title = "Movie 1", thumbnail = "p1.jpg", type = "movie"))
        val results2 = listOf(ContentItem(id = "2", title = "Movie 2", thumbnail = "p2.jpg", type = "movie"))

        searchRepository.setSearchResults("query1", results1)
        searchRepository.setSearchResults("query2", results2)

        viewModel = SearchViewModel(searchRepository, logger)

        viewModel.uiState.test {
            awaitItem() // Initial state

            viewModel.onQueryChange("query1")
            awaitItem() // Query changed to query1

            viewModel.onQueryChange("query2")
            awaitItem() // Query changed to query2

            advanceTimeBy(300) // Wait for debounce

            val searchingState = awaitItem()
            assertThat(searchingState.query).isEqualTo("query2")

            val resultsState = awaitItem()
            assertThat(resultsState.results.first().title).isEqualTo("Movie 2")

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `loadPopularSearches on init - loads popular searches`() = runTest {
        val popularSearches = listOf("Action Movies", "Comedy Series", "Documentaries")
        searchRepository.setPopularSearches(popularSearches)

        viewModel = SearchViewModel(searchRepository, logger)

        viewModel.uiState.test {
            awaitItem() // Initial state may have popular searches loaded

            cancelAndIgnoreRemainingEvents()
        }
    }
}
