package tv.bayit.plus.feature.zehani

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ZehAniRepository
import tv.bayit.plus.core.model.ZehAniProfile
import javax.inject.Inject

@HiltViewModel
class ZehAniDashboardViewModel @Inject constructor(
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ZehAniDashboardUiState>(ZehAniDashboardUiState.Loading)
    val uiState: StateFlow<ZehAniDashboardUiState> = _uiState.asStateFlow()

    init {
        loadDashboard()
    }

    fun retry() {
        _uiState.value = ZehAniDashboardUiState.Loading
        loadDashboard()
    }

    private fun loadDashboard() {
        viewModelScope.launch {
            logger.debug("Loading Zeh Ani dashboard")
            when (val result = zehAniRepository.getRecognitionHistory()) {
                is BayitResult.Success -> {
                    logger.info(
                        "Zeh Ani dashboard loaded",
                        mapOf("historyCount" to result.data.size.toString()),
                    )
                    _uiState.value = ZehAniDashboardUiState.Success(
                        historyCount = result.data.size,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Zeh Ani dashboard load failed", result.exception)
                    _uiState.value = ZehAniDashboardUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface ZehAniDashboardUiState {
    data object Loading : ZehAniDashboardUiState
    data class Success(val historyCount: Int) : ZehAniDashboardUiState
    data class Error(val message: String) : ZehAniDashboardUiState
}

data class ZehAniMenuCard(
    val id: ZehAniFeature,
    val title: String,
    val subtitle: String,
)

enum class ZehAniFeature {
    MAGIC_MIRROR,
    V2V_PRACTICE,
    AVATAR_3D,
    HIGHLIGHTS,
}
