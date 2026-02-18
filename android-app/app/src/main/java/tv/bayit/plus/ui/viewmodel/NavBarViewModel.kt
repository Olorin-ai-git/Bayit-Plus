package tv.bayit.plus.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.auth.AuthState
import tv.bayit.plus.core.auth.OlorinAuthService
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.UserRepository
import tv.bayit.plus.core.model.ProfileResponse
import javax.inject.Inject

/**
 * ViewModel for the global top navigation bar.
 * Observes [OlorinAuthService.authState] to load/clear user profile reactively:
 * - On Authenticated → fetches profile photo and display name via [UserRepository]
 * - On Unauthenticated → clears photo and name back to null
 * Also manages [currentLanguage] state, delegating persistence to [BayitStringProvider].
 */
@HiltViewModel
class NavBarViewModel @Inject constructor(
    private val authService: OlorinAuthService,
    private val userRepository: UserRepository,
    private val stringProvider: BayitStringProvider,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _userPhotoUrl = MutableStateFlow<String?>(null)
    val userPhotoUrl: StateFlow<String?> = _userPhotoUrl.asStateFlow()

    private val _userName = MutableStateFlow<String?>(null)
    val userName: StateFlow<String?> = _userName.asStateFlow()

    private val _currentLanguage = MutableStateFlow(stringProvider.currentLanguage)
    val currentLanguage: StateFlow<String> = _currentLanguage.asStateFlow()

    init {
        observeAuthState()
    }

    private fun observeAuthState() {
        viewModelScope.launch {
            authService.authState.collect { state ->
                when (state) {
                    is AuthState.Authenticated -> loadUser()
                    is AuthState.Unauthenticated -> clearUser()
                }
            }
        }
    }

    private suspend fun loadUser() {
        when (val result = userRepository.getCurrentUser()) {
            is BayitResult.Success -> {
                val profile = result.data as? ProfileResponse
                _userPhotoUrl.value = profile?.avatar
                _userName.value = profile?.displayName
                logger.info("NavBar profile loaded", mapOf("name" to (profile?.displayName ?: "")))
            }
            is BayitResult.Error -> {
                logger.error("NavBar profile load failed", result.exception)
            }
            is BayitResult.Loading -> { /* no-op */ }
        }
    }

    private fun clearUser() {
        _userPhotoUrl.value = null
        _userName.value = null
    }

    fun setLanguage(code: String) {
        viewModelScope.launch {
            stringProvider.setLanguage(code)
            _currentLanguage.value = code
            logger.info("Language changed via NavBar", mapOf("language" to code))
        }
    }
}
