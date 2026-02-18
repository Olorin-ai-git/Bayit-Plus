package tv.bayit.plus.feature.player.dubbing

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.LiveDubbingRepository
import tv.bayit.plus.core.media.DubbingMixer
import tv.bayit.plus.core.model.DubbingVoice
import tv.bayit.plus.feature.player.live.LiveDubbingManager
import tv.bayit.plus.feature.player.live.LiveDubbingUiState
import javax.inject.Inject

@HiltViewModel
class LiveDubbingViewModel @Inject constructor(
    private val dubbingManager: LiveDubbingManager,
    private val dubbingRepository: LiveDubbingRepository,
    private val dubbingMixer: DubbingMixer,
    private val logger: BayitLogger,
) : ViewModel() {

    val uiState: StateFlow<LiveDubbingUiState> = dubbingManager.state
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(), LiveDubbingUiState())

    private val _voices = MutableStateFlow<List<DubbingVoice>>(emptyList())
    val voices: StateFlow<List<DubbingVoice>> = _voices.asStateFlow()

    private val _selectedVoiceId = MutableStateFlow<String?>(null)
    val selectedVoiceId: StateFlow<String?> = _selectedVoiceId.asStateFlow()

    private val _isLoadingVoices = MutableStateFlow(false)
    val isLoadingVoices: StateFlow<Boolean> = _isLoadingVoices.asStateFlow()

    val originalVolume: StateFlow<Float> = dubbingMixer.originalVolume
    val dubbingVolume: StateFlow<Float> = dubbingMixer.dubbingVolume

    init {
        dubbingManager.onAudioSegmentReceived = { segment ->
            segment.data?.let { base64 ->
                dubbingMixer.playBase64Segment(base64)
            }
        }
    }

    fun toggleDubbing(channelId: String, targetLanguage: String) {
        viewModelScope.launch {
            if (uiState.value.isEnabled) {
                dubbingManager.stop()
                dubbingMixer.stopCurrentSegment()
            } else {
                dubbingManager.start(channelId, targetLanguage, viewModelScope)
            }
        }
    }

    fun loadVoices() {
        viewModelScope.launch {
            _isLoadingVoices.value = true
            when (val result = dubbingRepository.getVoices()) {
                is BayitResult.Success -> {
                    _voices.value = result.data
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load dubbing voices", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
            _isLoadingVoices.value = false
        }
    }

    fun selectVoice(voice: DubbingVoice) {
        _selectedVoiceId.value = voice.id
    }

    fun setOriginalVolume(volume: Float) {
        dubbingMixer.setOriginalVolume(volume)
    }

    fun setDubbingVolume(volume: Float) {
        dubbingMixer.setDubbingVolume(volume)
    }

    override fun onCleared() {
        dubbingManager.onAudioSegmentReceived = null
        super.onCleared()
    }
}
