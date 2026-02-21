package tv.bayit.plus.feature.player

import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch

private val PlayerViewModel.channelId: String?
    get() = (uiState.value as? PlayerUiState.Ready)?.channelId

// Live TV AI controls
fun PlayerViewModel.toggleAIPanel() = liveAICoordinator.togglePanel()

fun PlayerViewModel.toggleLiveSubtitles() =
    channelId?.let { viewModelScope.launch { liveAICoordinator.toggleSubtitles(it, viewModelScope) } }

fun PlayerViewModel.toggleLiveDubbing() =
    channelId?.let { viewModelScope.launch { liveAICoordinator.toggleDubbing(it, viewModelScope) } }

fun PlayerViewModel.toggleLiveTrivia() =
    channelId?.let { viewModelScope.launch { liveAICoordinator.toggleTrivia(it, viewModelScope) } }

fun PlayerViewModel.selectAILanguage(lang: String) =
    channelId?.let { viewModelScope.launch { liveAICoordinator.selectLanguage(lang, it, viewModelScope) } }

fun PlayerViewModel.dismissTriviaFact() = viewModelScope.launch { liveAICoordinator.dismissTrivia() }
fun PlayerViewModel.requestTriviaFollowUp() = liveAICoordinator.requestTriviaFollowUp()

// VOD trivia
fun PlayerViewModel.toggleVodTrivia() = vodTriviaManager.toggleEnabled()
fun PlayerViewModel.dismissVodTrivia() = vodTriviaManager.dismissFact()
fun PlayerViewModel.requestVodTriviaFollowUp() = vodTriviaManager.requestFollowUp(viewModelScope)
