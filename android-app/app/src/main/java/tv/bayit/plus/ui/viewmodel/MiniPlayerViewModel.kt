package tv.bayit.plus.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import tv.bayit.plus.core.media.AudioPlaybackManager
import tv.bayit.plus.core.media.AudioPlaybackState
import javax.inject.Inject

/**
 * Thin ViewModel providing scaffold-level access to [AudioPlaybackManager].
 *
 * Lives in the app module so that [tv.bayit.plus.ui.BayitMainScaffold] can
 * observe audio state and render the mini player bar above the bottom nav.
 */
@HiltViewModel
class MiniPlayerViewModel @Inject constructor(
    private val audioPlaybackManager: AudioPlaybackManager,
) : ViewModel() {

    val audioState: StateFlow<AudioPlaybackState> = audioPlaybackManager.state

    init {
        audioPlaybackManager.attachScope(viewModelScope)
    }

    fun togglePlayPause() = audioPlaybackManager.togglePlayPause()
    fun skipBackward() = audioPlaybackManager.skipBackward()
    fun skipForward() = audioPlaybackManager.skipForward()
    fun stop() = audioPlaybackManager.stop()
}
