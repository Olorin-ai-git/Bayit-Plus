package tv.bayit.plus.feature.vod

import androidx.annotation.StringRes
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.CategoryRepository
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.feature.vod.R
import javax.inject.Inject

enum class VodFilter(@StringRes val labelResId: Int) {
    ALL(R.string.vod_filter_all),
    COLLECTIONS(R.string.vod_filter_collections),
    MOVIES(R.string.vod_filter_movies),
    SERIES(R.string.vod_filter_series),
    ISRAELI_MOVIES(R.string.vod_filter_israeli_movies),
    ISRAELI_SERIES(R.string.vod_filter_israeli_series),
    MUSIC(R.string.vod_filter_music),
    DOCUMENTARY(R.string.vod_filter_documentary),
}

@HiltViewModel
class VodViewModel @Inject constructor(
    internal val contentRepository: ContentRepository,
    internal val categoryRepository: CategoryRepository,
    internal val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<VodUiState>(VodUiState.Loading)
    val uiState: StateFlow<VodUiState> = _uiState.asStateFlow()

    internal val allItems = MutableStateFlow<List<ContentItem>>(emptyList())
    internal val collections = MutableStateFlow<List<CollectionDetail>>(emptyList())
    internal val sectionCategoryIds = MutableStateFlow<Map<String, String>>(emptyMap())

    internal companion object {
        const val PAGE_SIZE = 200
    }

    init {
        loadAllContent()
        loadCategories()
        loadCollectionRecommendations()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is VodUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadAllContent()
        loadCategories()
        loadCollectionRecommendations()
    }

    internal fun updateUiState(state: VodUiState) {
        _uiState.value = state
    }
}

sealed interface VodUiState {
    data object Loading : VodUiState

    data class Success(
        val selectedFilter: VodFilter = VodFilter.ALL,
        val contentItems: List<ContentItem>,
        val featuredCollections: List<CollectionDetail> = emptyList(),
        val isRefreshing: Boolean = false,
        val isLoadingContent: Boolean = false,
    ) : VodUiState

    data class Error(
        val message: String,
    ) : VodUiState
}
