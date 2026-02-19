package tv.bayit.plus.feature.zehani.mirror

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.StarStoryRepository
import tv.bayit.plus.core.data.repository.ZehAniRepository
import tv.bayit.plus.core.model.zehani.MagicMirrorGreeting
import javax.inject.Inject

@HiltViewModel
class MagicMirrorViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val zehAniRepository: ZehAniRepository,
    private val starStoryRepository: StarStoryRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    val profileId: String = checkNotNull(savedStateHandle["profileId"])
    private val avatarIdFromRoute: String = savedStateHandle["avatarId"] ?: ""

    private val _uiState = MutableStateFlow<MagicMirrorUiState>(MagicMirrorUiState.Loading)
    val uiState: StateFlow<MagicMirrorUiState> = _uiState.asStateFlow()

    private val _avatarImageUrl = MutableStateFlow<String?>(null)
    val avatarImageUrl: StateFlow<String?> = _avatarImageUrl.asStateFlow()

    private val _noAvatar = MutableStateFlow(false)
    val noAvatar: StateFlow<Boolean> = _noAvatar.asStateFlow()

    init {
        loadGreeting()
        resolveAndLoadAvatar()
    }

    fun refreshGreeting() {
        viewModelScope.launch {
            _uiState.value = MagicMirrorUiState.Loading
            logger.debug("Refreshing greeting", mapOf("profileId" to profileId))
            when (val result = zehAniRepository.refreshGreeting(profileId)) {
                is BayitResult.Success -> {
                    logger.info("Greeting refreshed", mapOf("profileId" to profileId))
                    _uiState.value = MagicMirrorUiState.GreetingReady(result.data)
                }
                is BayitResult.Error -> {
                    logger.error("Greeting refresh failed", result.exception)
                    _uiState.value = MagicMirrorUiState.Error(result.message ?: result.exception.message.orEmpty())
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = MagicMirrorUiState.Loading
        loadGreeting()
    }

    private fun loadGreeting() {
        viewModelScope.launch {
            logger.debug("Loading daily greeting", mapOf("profileId" to profileId))
            when (val result = zehAniRepository.getDailyGreeting(profileId)) {
                is BayitResult.Success -> {
                    logger.info("Daily greeting loaded", mapOf("profileId" to profileId))
                    _uiState.value = MagicMirrorUiState.GreetingReady(result.data)
                }
                is BayitResult.Error -> {
                    logger.error("Daily greeting load failed", result.exception)
                    _uiState.value = MagicMirrorUiState.Error(result.message ?: result.exception.message.orEmpty())
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun resolveAndLoadAvatar() {
        viewModelScope.launch {
            val resolvedAvatarId = if (avatarIdFromRoute.isNotBlank()) {
                avatarIdFromRoute
            } else {
                logger.debug("No avatarId in route, fetching avatars for profile", mapOf("profileId" to profileId))
                when (val result = starStoryRepository.listAvatarsForProfile(profileId)) {
                    is BayitResult.Success -> result.data.firstOrNull()?.avatarId
                    is BayitResult.Error -> {
                        logger.debug("Avatar list fetch failed", mapOf("profileId" to profileId))
                        null
                    }
                    is BayitResult.Loading -> null
                }
            }

            if (resolvedAvatarId == null) {
                _noAvatar.value = true
                return@launch
            }
            loadAvatarImage(resolvedAvatarId)
        }
    }

    private suspend fun loadAvatarImage(avatarId: String) {
        logger.debug("Loading avatar image", mapOf("avatarId" to avatarId))
        when (val result = zehAniRepository.getMeshStatus(avatarId)) {
            is BayitResult.Success -> {
                _avatarImageUrl.value = result.data.avatarImageUrl
                _noAvatar.value = result.data.avatarImageUrl == null
                logger.info("Avatar image loaded", mapOf("hasImage" to (result.data.avatarImageUrl != null).toString()))
            }
            is BayitResult.Error -> {
                _noAvatar.value = true
                logger.debug("No avatar image found", mapOf("avatarId" to avatarId))
            }
            is BayitResult.Loading -> Unit
        }
    }
}

sealed interface MagicMirrorUiState {
    data object Loading : MagicMirrorUiState
    data class GreetingReady(val greeting: MagicMirrorGreeting) : MagicMirrorUiState
    data class Error(val message: String) : MagicMirrorUiState
}
