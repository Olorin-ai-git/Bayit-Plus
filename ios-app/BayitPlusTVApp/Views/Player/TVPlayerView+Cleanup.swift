import BayitAuth
import BayitCore
import BayitMedia
import SwiftUI

/// Player view model cleanup on disappear and social feature teardown.
extension TVPlayerView {
    // MARK: - Cleanup

    @MainActor
    func cleanup() {
        state.progressTrackingTask?.cancel()
        state.progressTrackingTask = nil
        Task { await saveProgress() }
        mediaPlayer.pause()
        cleanupViewModels()
        cleanupSocialFeatures()
    }

    private func cleanupViewModels() {
        state.liveDubbingVM?.cleanup()
        state.liveSubtitlesVM?.cleanup()
        state.triviaVM?.cleanup()
        state.triviaVM?.disconnectLiveTrivia()
        state.catchUpVM?.reset()
        state.catchUpVM = nil
        state.interactionVM = nil
        state.voiceService = nil
        if state.dialogueVM?.isActive == true {
            Task { await state.dialogueVM?.endSession() }
        }
        state.dialogueVM = nil
    }

    private func cleanupSocialFeatures() {
        if state.sharedVM?.isActive == true {
            Task { await state.sharedVM?.endSharedInteraction() }
        }
        state.sharedVM = nil
        state.showSharedInteraction = false
        state.interactiveSubtitleVM?.clearSession()
        state.interactiveSubtitleVM = nil
        if let sharePlay = state.sharePlayService {
            Task { await sharePlay.leaveSession() }
        }
        state.sharePlayService = nil
        state.showSharePlayOverlay = false
    }
}
