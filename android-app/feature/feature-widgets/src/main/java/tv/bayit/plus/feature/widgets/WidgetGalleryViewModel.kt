package tv.bayit.plus.feature.widgets

import androidx.lifecycle.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.WidgetRepository
import javax.inject.Inject

@HiltViewModel
class WidgetGalleryViewModel @Inject constructor(private val widgetRepository: WidgetRepository, private val logger: BayitLogger) : ViewModel() {
    private val _uiState = MutableStateFlow<WidgetGalleryUiState>(WidgetGalleryUiState.Loading)
    val uiState = _uiState.asStateFlow()

    init { loadWidgets() }

    fun configureWidget(widgetId: String) {
        viewModelScope.launch {
            logger.debug("Configuring widget", mapOf("widgetId" to widgetId))
            when (val result = widgetRepository.configureWidget(widgetId, emptyMap())) {
                is BayitResult.Success -> { logger.info("Widget configured"); loadWidgets() }
                is BayitResult.Error -> logger.error("Widget configuration failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() { _uiState.value = WidgetGalleryUiState.Loading; loadWidgets() }

    private fun loadWidgets() {
        viewModelScope.launch {
            logger.debug("Loading available widgets")
            when (val result = widgetRepository.getAvailableWidgets()) {
                is BayitResult.Success -> { logger.info("Widgets loaded", mapOf("count" to result.data.size.toString())); _uiState.value = WidgetGalleryUiState.Success(result.data) }
                is BayitResult.Error -> { logger.error("Widgets load failed", result.exception); _uiState.value = WidgetGalleryUiState.Error(result.message ?: result.exception.message.orEmpty()) }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface WidgetGalleryUiState {
    data object Loading : WidgetGalleryUiState
    data class Success(val widgets: List<Any>) : WidgetGalleryUiState
    data class Error(val message: String) : WidgetGalleryUiState
}
