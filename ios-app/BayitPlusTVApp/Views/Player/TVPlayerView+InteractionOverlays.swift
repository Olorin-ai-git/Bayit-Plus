import BayitAuth
import BayitCore
import BayitMedia
import SwiftUI

/// Interactive feature overlays: pause-and-ask, interactive moments,
/// shared interactions, and volume ducking helpers.
/// Free-form dialogue is handled inline by TVCharacterDialogueFlowView
/// within the showCharacterSelection fullScreenCover.
extension TVPlayerView {
    // MARK: - Free-Form Dialogue Entry

    func openCharacterSelection() async {
        if state.dialogueVM == nil {
            state.dialogueVM = AvatarDialogueViewModel(
                repository: repos.avatarMeshRepository
            )
        }
        await state.dialogueVM?.loadCharacters(contentId: contentId)
        mediaPlayer.avPlayer.pause()
        duckVolume()
        state.showControlButtons = false
        state.showCharacterSelection = true
    }

    // MARK: - Pause & Ask Overlay

    @ViewBuilder
    var pauseAskOverlay: some View {
        if state.showPauseAskOverlay,
           let vm = state.dialogueVM,
           let imgUrl = state.avatarImageUrl,
           state.hasVoiceClone
        {
            TVPauseAskDialogueOverlayView(
                avatarImageUrl: imgUrl,
                avatarId: state.resolvedAvatarId,
                contentId: contentId,
                currentTimestamp: mediaPlayer.currentTime,
                characters: vm.availableCharacters,
                viewModel: vm,
                voiceService: state.voiceService,
                onDismiss: {
                    Task { await dismissPauseAsk() }
                }
            )
        }
    }

    func startPauseAskInteraction() async {
        if state.dialogueVM == nil {
            state.dialogueVM = AvatarDialogueViewModel(
                repository: repos.avatarMeshRepository
            )
        }
        await state.dialogueVM?.loadCharacters(contentId: contentId)
        mediaPlayer.avPlayer.pause()
        state.showControlButtons = false
        state.showPauseAskOverlay = true
    }

    func dismissPauseAsk() async {
        state.showPauseAskOverlay = false
        mediaPlayer.avPlayer.play()
        await state.dialogueVM?.endSession()
    }

    // MARK: - Interactive Moment Overlay

    @ViewBuilder
    var interactiveMomentOverlay: some View {
        if let vm = state.interactionVM,
           let moment = vm.activeMoment,
           let videoUrl = moment.lipsyncVideoUrl,
           let imgUrl = state.avatarImageUrl
        {
            TVInteractiveMomentOverlayView(
                avatarVideoUrl: videoUrl,
                avatarImageUrl: imgUrl,
                characterVideoUrl: moment.characterResponseVideoUrl,
                characterImageUrl: moment.characterFrameUrl,
                onDismiss: { mediaPlayer.avPlayer.play(); restoreVolume(); vm.dismiss() }
            )
            .onAppear { mediaPlayer.avPlayer.pause(); duckVolume() }
        }

        if state.showNoAvatarWarning {
            noAvatarWarningBanner
        }
    }

    // MARK: - Shared Interaction Overlay (Phase 3 WS4)

    @ViewBuilder
    var sharedInteractionOverlay: some View {
        if state.showSharedInteraction, let vm = state.sharedVM {
            TVSharedInteractionView(viewModel: vm) {
                state.showSharedInteraction = false
                Task { await state.sharedVM?.endSharedInteraction() }
            }
            .transition(.move(edge: .trailing).combined(with: .opacity))
        }
    }

    // MARK: - Volume Ducking

    func duckVolume() {
        let duckedLevel: Float = 0.15
        state.volumeBeforeDuck = mediaPlayer.avPlayer.volume
        mediaPlayer.avPlayer.volume = duckedLevel
    }

    func restoreVolume() {
        let target = state.volumeBeforeDuck ?? 1.0
        withAnimation {
            mediaPlayer.avPlayer.volume = target
        }
        state.volumeBeforeDuck = nil
    }
}
