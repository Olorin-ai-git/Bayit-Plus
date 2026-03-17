import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Interactive feature overlays: pause-and-ask, interactive moments,
/// shared interactions, and volume ducking helpers.
/// Free-form dialogue is handled inline by TVCharacterDialogueFlowView
/// within the showCharacterSelection fullScreenCover.
extension TVPlayerView {
    // MARK: - Walkthrough Coach Mark

    func walkthroughCoachMark(forLiveTV: Bool) -> some View {
        let icon = forLiveTV ? "captions.bubble" : "playpause.fill"
        let key = forLiveTV
            ? "player.walkthrough.liveSubtitleHint"
            : "player.walkthrough.coachMark"
        return HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p300)
            Text(localization.t(key))
                .font(.system(
                    size: TVDesignTokens.FontSize.md,
                    weight: .semibold
                ))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bgStrong)
        .clipShape(Capsule())
        .overlay(
            Capsule().stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .padding(.top, TVDesignTokens.Spacing.xxl)
    }

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
           state.hasVoiceClone
        {
            TVPauseAskDialogueOverlayView(
                avatarId: state.resolvedAvatarId,
                contentId: contentId,
                currentTimestamp: mediaPlayer.currentTime,
                characters: vm.availableCharacters,
                viewModel: vm,
                voiceService: state.voiceService,
                onResumePlayback: { mediaPlayer.avPlayer.play() },
                onPausePlayback: { mediaPlayer.avPlayer.pause() },
                onDismiss: {
                    Task { await dismissPauseAsk() }
                },
                isWalkthroughMode: state.isWalkthroughMode
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
                onDismiss: { mediaPlayer.avPlayer.play(); vm.dismiss() }
            )
            .onAppear { mediaPlayer.avPlayer.pause() }
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

    // MARK: - Interactive Subtitles Toggle

    func toggleInteractiveSubtitles() {
        if state.interactiveSubtitleVM == nil {
            state.interactiveSubtitleVM = TVWordInteractionViewModel(
                repository: repos.subtitle
            )
        }
        if let vm = state.interactiveSubtitleVM {
            vm.isEnabled.toggle()
        }
    }

    // MARK: - SharePlay

    func activateSharePlay() async {
        if state.sharePlayService == nil {
            state.sharePlayService = TVSharePlayService()
        }
        guard let service = state.sharePlayService else { return }
        await service.startActivity(
            contentId: contentId,
            contentType: contentType.rawValue,
            contentTitle: ""
        )
        state.showSharePlayOverlay = true
    }

    @ViewBuilder
    var sharePlayOverlay: some View {
        if state.showSharePlayOverlay, let service = state.sharePlayService {
            TVSharePlayOverlay(
                service: service,
                onEnd: {
                    Task { await service.leaveSession() }
                    state.showSharePlayOverlay = false
                }
            )
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
