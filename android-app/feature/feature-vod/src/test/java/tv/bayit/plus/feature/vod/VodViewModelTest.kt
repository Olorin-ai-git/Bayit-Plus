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
import tv.bayit.plus.core.testing.FakeContentRepository

@ExtendWith(CoroutineTestRule::class)
class VodViewModelTest {

    private lateinit var contentRepository: FakeContentRepository
    private lateinit var categoryRepository: FakeCategoryRepository
    private val logger = NoOpBayitLogger()

    private lateinit var viewModel: VodViewModel

    @BeforeEach
    fun setup() {
        contentRepository = FakeContentRepository()
        categoryRepository = FakeCategoryRepository()
    }

    @AfterEach
    fun tearDown() {
        contentRepository.clear()
        categoryRepository.clear()
    }

    @Test
    fun `initial state is Loading`() = runTest {
        viewModel = VodViewModel(contentRepository, categoryRepository, logger)

        viewModel.uiState.test {
            val initialState = awaitItem()
            assertThat(initialState).isInstanceOf(VodUiState.Loading::class.java)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `loadAllContent success - shows all items with ALL filter`() = runTest {
        contentRepository.allContentItems.addAll(
            listOf(
                ContentItem(id = "movie-1", title = "Movie 1", type = "movie"),
                ContentItem(id = "series-1", title = "Series 1", type = "series", isSeries = true),
            )
        )

        viewModel = VodViewModel(contentRepository, categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading

            val successState = awaitItem() as VodUiState.Success
            assertThat(successState.selectedFilter).isEqualTo(VodFilter.ALL)
            assertThat(successState.contentItems).hasSize(2)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `loadAllContent error - transitions to Error state`() = runTest {
        contentRepository.shouldReturnError = true
        contentRepository.errorMessage = "Network error"

        viewModel = VodViewModel(contentRepository, categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading

            val errorState = awaitItem()
            assertThat(errorState).isInstanceOf(VodUiState.Error::class.java)
            assertThat((errorState as VodUiState.Error).message).contains("Network error")

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `selectFilter MOVIES - filters locally`() = runTest {
        contentRepository.allContentItems.addAll(
            listOf(
                ContentItem(id = "movie-1", title = "Movie 1", type = "movie"),
                ContentItem(id = "series-1", title = "Series 1", type = "series", isSeries = true),
                ContentItem(id = "movie-2", title = "Movie 2", type = "movie"),
            )
        )

        viewModel = VodViewModel(contentRepository, categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading
            skipItems(1) // Skip initial Success (ALL)

            viewModel.selectFilter(VodFilter.MOVIES)

            val filteredState = awaitItem() as VodUiState.Success
            assertThat(filteredState.selectedFilter).isEqualTo(VodFilter.MOVIES)
            assertThat(filteredState.contentItems).hasSize(2)
            assertThat(filteredState.contentItems.all { it.type == "movie" }).isTrue()

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `selectFilter SERIES - filters locally`() = runTest {
        contentRepository.allContentItems.addAll(
            listOf(
                ContentItem(id = "movie-1", title = "Movie 1", type = "movie"),
                ContentItem(id = "series-1", title = "Series 1", type = "series", isSeries = true),
            )
        )

        viewModel = VodViewModel(contentRepository, categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading
            skipItems(1) // Skip initial Success (ALL)

            viewModel.selectFilter(VodFilter.SERIES)

            val filteredState = awaitItem() as VodUiState.Success
            assertThat(filteredState.contentItems).hasSize(1)
            assertThat(filteredState.contentItems.first().id).isEqualTo("series-1")

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `selectFilter ISRAELI_SERIES - matches category display name`() = runTest {
        contentRepository.allContentItems.addAll(
            listOf(
                ContentItem(
                    id = "israeli-series-1",
                    title = "HaBurganim",
                    type = "series",
                    isSeries = true,
                    category = "Israeli Series",
                    categorySlug = "series",
                ),
                ContentItem(
                    id = "regular-series-1",
                    title = "Regular Series",
                    type = "series",
                    isSeries = true,
                    category = "Series",
                    categorySlug = "series",
                ),
            )
        )

        viewModel = VodViewModel(contentRepository, categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading
            skipItems(1) // Skip initial Success (ALL)

            viewModel.selectFilter(VodFilter.ISRAELI_SERIES)

            val filteredState = awaitItem() as VodUiState.Success
            assertThat(filteredState.contentItems).hasSize(1)
            assertThat(filteredState.contentItems.first().id).isEqualTo("israeli-series-1")

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `selectFilter MUSIC - loads from category endpoint`() = runTest {
        val musicCategoryId = "music-cat-id"
        categoryRepository.setCategories(
            listOf(ContentCategory(id = musicCategoryId, name = "מוזיקה"))
        )
        val musicItems = listOf(
            ContentItem(id = "music-1", title = "Soul", type = "movie"),
            ContentItem(id = "music-2", title = "Sing 2", type = "movie"),
        )
        categoryRepository.setContentForCategory(musicCategoryId, 1, musicItems)

        contentRepository.allContentItems.add(
            ContentItem(id = "movie-1", title = "Movie 1", type = "movie")
        )

        viewModel = VodViewModel(contentRepository, categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading
            skipItems(1) // Skip initial Success (ALL)

            viewModel.selectFilter(VodFilter.MUSIC)

            val loadingState = awaitItem() as VodUiState.Success
            assertThat(loadingState.isLoadingContent).isTrue()

            val filteredState = awaitItem() as VodUiState.Success
            assertThat(filteredState.contentItems).hasSize(2)
            assertThat(filteredState.contentItems.first().id).isEqualTo("music-1")

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `selectFilter DOCUMENTARY - loads from category endpoint`() = runTest {
        val docCategoryId = "doc-cat-id"
        categoryRepository.setCategories(
            listOf(ContentCategory(id = docCategoryId, name = "תיעודיים"))
        )
        val docItems = listOf(
            ContentItem(id = "doc-1", title = "BBC Life", type = "series"),
            ContentItem(id = "doc-2", title = "The Green Prince", type = "movie"),
        )
        categoryRepository.setContentForCategory(docCategoryId, 1, docItems)

        contentRepository.allContentItems.add(
            ContentItem(id = "movie-1", title = "Movie 1", type = "movie")
        )

        viewModel = VodViewModel(contentRepository, categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading
            skipItems(1) // Skip initial Success (ALL)

            viewModel.selectFilter(VodFilter.DOCUMENTARY)

            val loadingState = awaitItem() as VodUiState.Success
            assertThat(loadingState.isLoadingContent).isTrue()

            val filteredState = awaitItem() as VodUiState.Success
            assertThat(filteredState.contentItems).hasSize(2)

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `refresh - reloads content and preserves filter`() = runTest {
        contentRepository.allContentItems.add(
            ContentItem(id = "movie-1", title = "Movie 1", type = "movie")
        )

        viewModel = VodViewModel(contentRepository, categoryRepository, logger)

        viewModel.uiState.test {
            skipItems(1) // Skip Loading
            val initialState = awaitItem() as VodUiState.Success
            assertThat(initialState.isRefreshing).isFalse()

            viewModel.refresh()

            val refreshingState = awaitItem() as VodUiState.Success
            assertThat(refreshingState.isRefreshing).isTrue()

            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `applyLocalFilter - ALL returns everything`() {
        val items = listOf(
            ContentItem(id = "1", type = "movie"),
            ContentItem(id = "2", type = "series", isSeries = true),
        )
        val result = applyLocalFilter(items, VodFilter.ALL)
        assertThat(result).hasSize(2)
    }

    @Test
    fun `applyLocalFilter - empty list returns empty`() {
        val result = applyLocalFilter(emptyList(), VodFilter.MOVIES)
        assertThat(result).isEmpty()
    }
}
