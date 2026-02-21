import BayitAuth
import BayitCore
import BayitMedia
import SwiftUI

/// Interactive feature overlays: dialogue, pause-and-ask, interactive moments,
/// shared interactions, and volume ducking helpers.
extension TVPlayerView {
    // MARK: - Free-Form Dialogue Overlay

    @ViewBuilder
    var dialogueOverlay: some View {
        if state.showDialogueOverlay,
           let vm = state.dialogueVM,
           let character = vm.selectedCharacter,
           let imgUrl = state.avatarImageUrl
        {
            TVAvatarDialogueOverlayView(
                avatarImageUrl: imgUrl,
                character: character,
                viewModel: vm,
                voiceService: state.voiceService,
                avatarPlacement: state.interactionVM?.activeMoment?.avatarPlacement,
                onDismiss: {
                    Task { await dismissDialogue() }
                }
            )
        }
    }

    func openCharacterSelection() async {
        if state.dialogueVM == nil {
            state.dialogueVM = AvatarDialogueViewModel(
                repository: repos.avatarMeshRepository
            )
        }
        await state.dialogueVM?.loadCharacters(contentId: contentId)
        state.showCharacterSelection = true
    }

    func startDialogue(with character: ContentCharacter) async {
        guard let profileId = authManager.activeProfile?.id,
              let avatarId = state.resolvedAvatarId else { return }

        await state.dialogueVM?.startSession(
            contentId: contentId,
            profileId: profileId,
            avatarId: avatarId,
            character: character,
            currentTimestamp: mediaPlayer.currentTime
        )
        duckVolume()
        state.showDialogueOverlay = true
    }

    func dismissDialogue() async {
        restoreVolume()
        state.showDialogueOverlay = false
        await state.dialogueVM?.endSession()
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
        state.showPauseAskOverlay = true
    }

    func dismissPauseAsk() async {
        mediaPlayer.avPlayer.play()
        state.showPauseAskOverlay = false
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
                onDismiss: { restoreVolume(); vm.dismiss() }
            )
            .onAppear { duckVolume() }
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
