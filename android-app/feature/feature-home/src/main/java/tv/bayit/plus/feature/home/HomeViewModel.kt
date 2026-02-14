package tv.bayit.plus.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.model.ContentCategory
import tv.bayit.plus.core.model.FeaturedResponse
import tv.bayit.plus.core.model.SpotlightItem
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadHomeFeed()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is HomeUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadHomeFeed()
    }

    private fun loadHomeFeed() {
        viewModelScope.launch {
            logger.debug("Loading home feed")

            when (val featuredResult = contentRepository.getFeatured()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val items = featuredResult.data as List<Any>
                    val spotlight = items.filterIsInstance<SpotlightItem>()

                    when (val categoriesResult = contentRepository.getHomeFeed()) {
                        is BayitResult.Success -> {
                            @Suppress("UNCHECKED_CAST")
                            val categoryItems = categoriesResult.data as List<Any>
                            handleFeedLoaded(spotlight, categoryItems)
                        }
                        is BayitResult.Error -> {
                            handleFeedLoaded(spotlight, emptyList())
                        }
                        is BayitResult.Loading -> Unit
                    }
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Home feed load failed",
                        featuredResult.exception,
                        mapOf("errorMessage" to featuredResult.message.orEmpty()),
                    )
                    _uiState.value = HomeUiState.Error(
                        message = featuredResult.message ?: featuredResult.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun handleFeedLoaded(
        spotlight: List<SpotlightItem>,
        categoryItems: List<Any>,
    ) {
        logger.info(
            "Home feed loaded",
            mapOf(
                "spotlightCount" to spotlight.size.toString(),
                "categoryItemCount" to categoryItems.size.toString(),
            ),
        )
        _uiState.value = HomeUiState.Success(
            spotlight = spotlight,
            categoryItems = categoryItems,
            isRefreshing = false,
        )
    }
}

sealed interface HomeUiState {
    data object Loading : HomeUiState

    data class Success(
        val spotlight: List<SpotlightItem>,
        val categoryItems: List<Any>,
        val isRefreshing: Boolean = false,
    ) : HomeUiState

    data class Error(
        val message: String,
    ) : HomeUiState
}
