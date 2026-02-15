package tv.bayit.plus.feature.vod.favorites

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
import tv.bayit.plus.core.model.FavoriteItem
import javax.inject.Inject

@HiltViewModel
class FavoritesViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<FavoritesUiState>(FavoritesUiState.Loading)
    val uiState: StateFlow<FavoritesUiState> = _uiState.asStateFlow()

    init {
        loadFavorites()
    }

    fun removeFavorite(contentId: String) {
        val current = _uiState.value as? FavoritesUiState.Success ?: return
        viewModelScope.launch {
            logger.debug("Removing favorite", mapOf("contentId" to contentId))
            when (val result = contentRepository.removeFavorite(contentId)) {
                is BayitResult.Success -> {
                    val updatedItems = current.items.filterNot { it.id == contentId }
                    if (updatedItems.isEmpty()) {
                        _uiState.value = FavoritesUiState.Empty
                    } else {
                        _uiState.value = current.copy(items = updatedItems)
                    }
                    logger.info("Favorite removed", mapOf("contentId" to contentId))
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Failed to remove favorite",
                        result.exception,
                        mapOf("contentId" to contentId),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = FavoritesUiState.Loading
        loadFavorites()
    }

    private fun loadFavorites() {
        viewModelScope.launch {
            logger.debug("Loading favorites")
            when (val result = contentRepository.getFavorites()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val items = (result.data as List<Any>).filterIsInstance<FavoriteItem>()

                    logger.info(
                        "Favorites loaded",
                        mapOf("count" to items.size.toString()),
                    )

                    if (items.isEmpty()) {
                        _uiState.value = FavoritesUiState.Empty
                    } else {
                        _uiState.value = FavoritesUiState.Success(items = items)
                    }
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Favorites load failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = FavoritesUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface FavoritesUiState {
    data object Loading : FavoritesUiState
    data object Empty : FavoritesUiState

    data class Success(
        val items: List<FavoriteItem>,
    ) : FavoritesUiState

    data class Error(
        val message: String,
    ) : FavoritesUiState
}
