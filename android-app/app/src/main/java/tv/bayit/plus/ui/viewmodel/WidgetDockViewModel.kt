package tv.bayit.plus.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.data.repository.WidgetRepository
import tv.bayit.plus.core.model.WidgetItem
import javax.inject.Inject

/**
 * ViewModel managing the global floating widget dock state.
 * Loads user's active widgets and tracks minimize/restore state.
 * Matches iOS WidgetDockViewModel functionality.
 */
@HiltViewModel
class WidgetDockViewModel @Inject constructor(
    private val widgetRepository: WidgetRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(WidgetDockUiState())
    val uiState: StateFlow<WidgetDockUiState> = _uiState.asStateFlow()

    private val restoredWidgetIds = mutableSetOf<String>()

    init {
        loadWidgets()
    }

    fun loadWidgets() {
        if (_uiState.value.isLoading) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            when (val result = widgetRepository.getActiveWidgets()) {
                is BayitResult.Success -> {
                    val widgets = result.data.filterIsInstance<WidgetItem>()
                        .filter { it.isVisible != false }

                    restoredWidgetIds.clear()
                    restoredWidgetIds.addAll(
                        widgets.filter { it.isMinimized == false }.map { it.id }
                    )

                    _uiState.value = _uiState.value.copy(
                        widgets = widgets,
                        isLoading = false,
                        error = null
                    )
                }

                is BayitResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }

                is BayitResult.Loading -> {
                    // Already loading, no-op
                }
            }
        }
    }

    fun toggleMinimize(widgetId: String) {
        val isCurrentlyRestored = restoredWidgetIds.contains(widgetId)

        if (isCurrentlyRestored) {
            restoredWidgetIds.remove(widgetId)
        } else {
            restoredWidgetIds.add(widgetId)
        }

        _uiState.value = _uiState.value.copy(
            restoredWidgetIds = restoredWidgetIds.toSet()
        )

        viewModelScope.launch {
            val newIsMinimized = isCurrentlyRestored
            val result = widgetRepository.toggleMinimize(widgetId, newIsMinimized)

            if (result is BayitResult.Error) {
                if (isCurrentlyRestored) {
                    restoredWidgetIds.add(widgetId)
                } else {
                    restoredWidgetIds.remove(widgetId)
                }
                _uiState.value = _uiState.value.copy(
                    restoredWidgetIds = restoredWidgetIds.toSet()
                )
            }
        }
    }

    fun minimizeWidget(widgetId: String) {
        if (restoredWidgetIds.contains(widgetId)) {
            toggleMinimize(widgetId)
        }
    }

    fun toggleDock() {
        _uiState.value = _uiState.value.copy(
            isDockVisible = !_uiState.value.isDockVisible
        )
    }

    fun hideDock() {
        _uiState.value = _uiState.value.copy(isDockVisible = false)
    }

    fun getMinimizedWidgets(): List<WidgetItem> {
        return _uiState.value.widgets.filter { widget ->
            !restoredWidgetIds.contains(widget.id)
        }
    }

    fun getRestoredWidgets(): List<WidgetItem> {
        return _uiState.value.widgets.filter { widget ->
            restoredWidgetIds.contains(widget.id)
        }
    }
}

data class WidgetDockUiState(
    val widgets: List<WidgetItem> = emptyList(),
    val restoredWidgetIds: Set<String> = emptySet(),
    val isDockVisible: Boolean = true,
    val isLoading: Boolean = false,
    val error: String? = null,
)
