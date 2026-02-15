package tv.bayit.plus.ui.viewmodel.zehani

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.data.model.zehani.FeedbackItem
import tv.bayit.plus.data.repository.ZehAniRepository
import javax.inject.Inject

data class FeedbackUiState(
    val isLoading: Boolean = true,
    val feedback: List<FeedbackItem> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class FeedbackViewModel @Inject constructor(
    private val repository: ZehAniRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(FeedbackUiState())
    val uiState: StateFlow<FeedbackUiState> = _uiState.asStateFlow()

    fun loadFeedback(profileId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.getFeedback(profileId).collect { result ->
                result.fold(
                    onSuccess = { feedback ->
                        _uiState.value = _uiState.value.copy(
                            feedback = feedback,
                            isLoading = false
                        )
                    },
                    onFailure = { error ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to load feedback"
                        )
                    }
                )
            }
        }
    }
}
