package tv.bayit.plus.feature.settings.billing

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.UserRepository
import tv.bayit.plus.core.model.ProfileResponse
import javax.inject.Inject

@HiltViewModel
class BillingViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<BillingUiState>(BillingUiState.Loading)
    val uiState: StateFlow<BillingUiState> = _uiState.asStateFlow()

    init {
        loadPaymentHistory()
    }

    private fun loadPaymentHistory() {
        viewModelScope.launch {
            logger.debug("Loading billing / payment history")
            when (val result = userRepository.getCurrentUser()) {
                is BayitResult.Success -> {
                    val profile = result.data as? ProfileResponse
                    _uiState.value = BillingUiState.Success(
                        email = profile?.email.orEmpty(),
                        createdAt = profile?.createdAt.orEmpty(),
                    )
                    logger.info("Billing info loaded")
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load billing info", result.exception)
                    _uiState.value = BillingUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = BillingUiState.Loading
        loadPaymentHistory()
    }
}

sealed interface BillingUiState {
    data object Loading : BillingUiState

    data class Success(
        val email: String,
        val createdAt: String,
    ) : BillingUiState

    data class Error(val message: String) : BillingUiState
}
