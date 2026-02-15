package tv.bayit.plus.feature.settings.support

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
import javax.inject.Inject

@HiltViewModel
class SupportViewModel @Inject constructor(
    private val settingsRepository: SettingsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<SupportUiState>(
        SupportUiState.Input(subject = "", message = ""),
    )
    val uiState: StateFlow<SupportUiState> = _uiState.asStateFlow()

    fun updateSubject(subject: String) {
        val current = _uiState.value as? SupportUiState.Input ?: return
        _uiState.value = current.copy(subject = subject)
    }

    fun updateMessage(message: String) {
        val current = _uiState.value as? SupportUiState.Input ?: return
        _uiState.value = current.copy(message = message)
    }

    fun submit() {
        val current = _uiState.value as? SupportUiState.Input ?: return
        if (current.subject.isBlank() || current.message.isBlank()) return

        _uiState.value = SupportUiState.Sending(
            subject = current.subject,
            message = current.message,
        )

        viewModelScope.launch {
            logger.debug(
                "Submitting support request",
                mapOf("subject" to current.subject),
            )
            when (val result = settingsRepository.submitSupportRequest(
                subject = current.subject,
                message = current.message,
            )) {
                is BayitResult.Success -> {
                    logger.info("Support request submitted")
                    _uiState.value = SupportUiState.Sent
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Support request failed",
                        result.exception,
                        mapOf("errorMessage" to result.message.orEmpty()),
                    )
                    _uiState.value = SupportUiState.Error(
                        subject = current.subject,
                        message = current.message,
                        errorMessage = result.message
                            ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun resetForm() {
        _uiState.value = SupportUiState.Input(subject = "", message = "")
    }

    fun retryFromError() {
        val current = _uiState.value as? SupportUiState.Error ?: return
        _uiState.value = SupportUiState.Input(
            subject = current.subject,
            message = current.message,
        )
    }
}

sealed interface SupportUiState {
    data class Input(
        val subject: String,
        val message: String,
    ) : SupportUiState

    data class Sending(
        val subject: String,
        val message: String,
    ) : SupportUiState

    data object Sent : SupportUiState

    data class Error(
        val subject: String,
        val message: String,
        val errorMessage: String,
    ) : SupportUiState
}
