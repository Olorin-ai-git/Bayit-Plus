package tv.bayit.plus.feature.settings.ai

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.SettingsRepository
import tv.bayit.plus.core.model.AIFeaturesSettings
import javax.inject.Inject

@HiltViewModel
class AIFeaturesViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<AIFeaturesUiState>(AIFeaturesUiState.Loading)
    val uiState: StateFlow<AIFeaturesUiState> = _uiState.asStateFlow()

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            logger.debug("Loading AI features settings")
            val settingsResult = settingsRepository.getAIFeaturesSettings()
            val creditsResult = settingsRepository.getBetaCreditsBalance()

            val settings = when (settingsResult) {
                is BayitResult.Success -> settingsResult.data
                is BayitResult.Error -> {
                    logger.error("Failed to load AI features settings", settingsResult.exception)
                    _uiState.value = AIFeaturesUiState.Error(
                        message = settingsResult.message ?: settingsResult.exception.message.orEmpty(),
                    )
                    return@launch
                }
                is BayitResult.Loading -> return@launch
            }

            val credits = when (creditsResult) {
                is BayitResult.Success -> creditsResult.data
                is BayitResult.Error -> {
                    logger.error("Failed to load beta credits", creditsResult.exception)
                    0
                }
                is BayitResult.Loading -> 0
            }

            _uiState.value = AIFeaturesUiState.Success(
                settings = settings,
                creditsBalance = credits,
                isSaving = false,
            )
            logger.info("AI features settings loaded", mapOf("credits" to credits.toString()))
        }
    }

    fun updateSettings(updated: AIFeaturesSettings) {
        val current = _uiState.value as? AIFeaturesUiState.Success ?: return
        _uiState.value = current.copy(settings = updated, isSaving = true)

        viewModelScope.launch {
            logger.debug("Updating AI features settings")
            when (val result = settingsRepository.updateAIFeaturesSettings(updated)) {
                is BayitResult.Success -> {
                    _uiState.value = current.copy(settings = updated, isSaving = false)
                    logger.info("AI features settings updated")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to update AI features settings", result.exception)
                    _uiState.value = current.copy(isSaving = false)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = AIFeaturesUiState.Loading
        loadSettings()
    }
}

sealed interface AIFeaturesUiState {
    data object Loading : AIFeaturesUiState

    data class Success(
        val settings: AIFeaturesSettings,
        val creditsBalance: Int,
        val isSaving: Boolean,
    ) : AIFeaturesUiState

    data class Error(val message: String) : AIFeaturesUiState
}
