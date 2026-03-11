package tv.bayit.plus.feature.zehani.v2v

import android.util.Base64
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.PhoneticMirrorRepository
import tv.bayit.plus.core.data.repository.PracticePhrase
import tv.bayit.plus.core.data.repository.StarStoryRepository
import tv.bayit.plus.core.data.repository.ZehAniRepository
import tv.bayit.plus.core.model.zehani.V2VSession
import tv.bayit.plus.core.model.zehani.V2VTransformResult
import javax.inject.Inject

@HiltViewModel
class V2VPracticeViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val zehAniRepository: ZehAniRepository,
    private val phoneticMirrorRepository: PhoneticMirrorRepository,
    private val starStoryRepository: StarStoryRepository,
    private val stringProvider: BayitStringProvider,
    private val logger: BayitLogger,
) : ViewModel() {

    private val avatarIdFromRoute: String = savedStateHandle["avatarId"] ?: ""
    val profileId: String = checkNotNull(savedStateHandle["profileId"])
    private var resolvedAvatarId: String = avatarIdFromRoute

    private val _uiState = MutableStateFlow<V2VPracticeUiState>(V2VPracticeUiState.Ready)
    val uiState: StateFlow<V2VPracticeUiState> = _uiState.asStateFlow()

    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()

    private val _currentPhrase = MutableStateFlow<PracticePhrase?>(null)
    val currentPhrase: StateFlow<PracticePhrase?> = _currentPhrase.asStateFlow()

    private val phrases = mutableListOf<PracticePhrase>()
    private var phraseIndex = 0

    init {
        resolveAvatarId()
        loadPhrases()
    }

    fun nextPhrase() {
        if (phrases.isEmpty()) return
        phraseIndex = (phraseIndex + 1) % phrases.size
        _currentPhrase.value = phrases[phraseIndex]
    }

    fun startRecording() {
        _isRecording.value = true
        logger.debug("Voice recording started", mapOf("profileId" to profileId))
    }

    fun stopRecording(audioData: ByteArray, practiceText: String) {
        _isRecording.value = false
        logger.debug("Voice recording stopped, submitting", mapOf("profileId" to profileId))
        submitAttempt(practiceText, audioData)
    }

    fun loadProgress() {
        viewModelScope.launch {
            _uiState.value = V2VPracticeUiState.LoadingGuide
            logger.debug("Loading V2V sessions", mapOf("profileId" to profileId))
            when (val result = zehAniRepository.getV2VSessions(profileId)) {
                is BayitResult.Success -> {
                    logger.info("V2V sessions loaded", mapOf("total" to result.data.total.toString()))
                    _uiState.value = V2VPracticeUiState.ProgressLoaded(result.data.sessions)
                }
                is BayitResult.Error -> {
                    logger.error("V2V sessions load failed", result.exception)
                    _uiState.value = V2VPracticeUiState.Error(result.message ?: result.exception.message.orEmpty())
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun resetToReady() { _uiState.value = V2VPracticeUiState.Ready }

    private fun loadPhrases() {
        viewModelScope.launch {
            logger.debug("Loading practice phrases", mapOf("profileId" to profileId))
            when (val result = phoneticMirrorRepository.fetchPhrases(profileId, "medium", 10)) {
                is BayitResult.Success -> {
                    phrases.clear()
                    phrases.addAll(result.data)
                    if (phrases.isNotEmpty()) _currentPhrase.value = phrases[0]
                    logger.info("Practice phrases loaded", mapOf("count" to phrases.size.toString()))
                }
                is BayitResult.Error -> logger.error("Failed to load practice phrases", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun resolveAvatarId() {
        if (avatarIdFromRoute.isNotBlank()) return
        viewModelScope.launch {
            logger.debug("Resolving avatar for V2V", mapOf("profileId" to profileId))
            when (val result = starStoryRepository.listAvatarsForProfile(profileId)) {
                is BayitResult.Success -> {
                    resolvedAvatarId = result.data.firstOrNull()?.avatarId.orEmpty()
                    if (resolvedAvatarId.isBlank()) {
                        logger.warning("No avatar found for V2V practice", mapOf("profileId" to profileId))
                    }
                }
                is BayitResult.Error -> logger.error("Avatar resolution failed for V2V", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun submitAttempt(text: String, audioData: ByteArray) {
        viewModelScope.launch {
            if (resolvedAvatarId.isBlank()) {
                _uiState.value = V2VPracticeUiState.Error(stringProvider.string("error.zehAni.noAvatarForVoice"))
                return@launch
            }
            _uiState.value = V2VPracticeUiState.Analyzing
            logger.debug("Submitting pronunciation attempt")
            val audioBase64 = Base64.encodeToString(audioData, Base64.NO_WRAP)
            when (val result = zehAniRepository.transformVoice(resolvedAvatarId, profileId, audioBase64, text)) {
                is BayitResult.Success -> {
                    logger.info("Pronunciation feedback received")
                    _uiState.value = V2VPracticeUiState.FeedbackReady(result.data)
                }
                is BayitResult.Error -> {
                    logger.error("Pronunciation attempt failed", result.exception)
                    _uiState.value = V2VPracticeUiState.Error(result.message ?: result.exception.message.orEmpty())
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface V2VPracticeUiState {
    data object Ready : V2VPracticeUiState
    data object LoadingGuide : V2VPracticeUiState
    data object Analyzing : V2VPracticeUiState
    data class FeedbackReady(val feedback: V2VTransformResult) : V2VPracticeUiState
    data class ProgressLoaded(val sessions: List<V2VSession>) : V2VPracticeUiState
    data class Error(val message: String) : V2VPracticeUiState
}
