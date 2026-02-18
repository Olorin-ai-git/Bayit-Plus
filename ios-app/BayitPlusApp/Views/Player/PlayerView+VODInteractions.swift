#if os(iOS)
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension on PlayerView providing VOD interactive moment overlay,
/// volume ducking, and initialization logic.
extension PlayerView {

    // MARK: - Interactive Moment Overlay

    @ViewBuilder
    var interactiveMomentOverlay: some View {
        if let vm = interactionVM,
           let moment = vm.activeMoment,
           let videoUrl = moment.lipsyncVideoUrl,
           let imgUrl = avatarImageUrl {
            InteractiveMomentOverlayView(
                avatarVideoUrl: videoUrl,
                avatarImageUrl: imgUrl,
                characterVideoUrl: moment.characterResponseVideoUrl,
                characterImageUrl: moment.characterFrameUrl,
                onDismiss: { restoreVolume(); vm.dismiss() }
            )
            .onAppear { duckVolume() }
        }

        if showNoAvatarWarning {
            noAvatarWarningBanner
        }
    }

    // MARK: - Volume Ducking

    func duckVolume() {
        let duckedLevel: Float = 0.15
        volumeBeforeDuck = viewModel.player.avPlayer.volume
        viewModel.player.avPlayer.volume = duckedLevel
    }

    func restoreVolume() {
        let target = volumeBeforeDuck ?? 1.0
        withAnimation {
            viewModel.player.avPlayer.volume = target
        }
        volumeBeforeDuck = nil
    }

    // MARK: - No Avatar Warning

    var noAvatarWarningBanner: some View {
        VStack {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(DesignTokens.Warning.default)
                Text(localization.t("settings.interactiveMomentsNoAvatar"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
            )
            Spacer()
        }
        .padding(.top, DesignTokens.Spacing.xl)
        .transition(.move(edge: .top).combined(with: .opacity))
        .onAppear {
            Task {
                try? await Task.sleep(for: .seconds(5))
                withAnimation { showNoAvatarWarning = false }
            }
        }
    }

    // MARK: - Free-Form Dialogue Overlay

    @ViewBuilder
    var dialogueOverlay: some View {
        if showDialogueOverlay,
           let vm = dialogueVM,
           let character = vm.selectedCharacter,
           let imgUrl = avatarImageUrl {
            AvatarDialogueOverlayView(
                avatarImageUrl: imgUrl,
                character: character,
                viewModel: vm,
                voiceService: voiceService,
                avatarPlacement: interactionVM?.activeMoment?.avatarPlacement,
                onDismiss: {
                    Task { await dismissDialogue() }
                }
            )
        }
    }

    func openCharacterSheet() async {
        if dialogueVM == nil {
            dialogueVM = AvatarDialogueViewModel(
                repository: repositories.avatarMeshRepository
            )
        }
        await dialogueVM?.loadCharacters(contentId: contentId)
        showCharacterSheet = true
    }

    func startDialogue(with character: ContentCharacter) async {
        guard let profileId = authManager.activeProfile?.id,
              let avatarId = resolvedAvatarId else { return }

        await dialogueVM?.startSession(
            contentId: contentId,
            profileId: profileId,
            avatarId: avatarId,
            character: character,
            currentTimestamp: viewModel.player.currentTime
        )
        duckVolume()
        showDialogueOverlay = true
    }

    func dismissDialogue() async {
        restoreVolume()
        showDialogueOverlay = false
        await dialogueVM?.endSession()
    }

    // MARK: - Initialization

    func initializeInteractiveMoments() async {
        let logger = BayitLogger(category: "PlayerView")

        // 1. Check user preference
        do {
            let prefsResponse = try await repositories.settings
                .fetchPreferences()
            let enabled = prefsResponse.preferences?
                .interactiveMomentsEnabled ?? false
            guard enabled else {
                logger.info(
                    "Interactive moments disabled in preferences"
                )
                return
            }
        } catch {
            logger.warning("Failed to fetch preferences: \(error)")
            return
        }

        // 2. Verify Creatify persona avatar exists
        do {
            let status = try await repositories.avatarMeshRepository
                .fetchAvatarStatus(avatarId: "any")
            guard let imageUrl = status.avatarImageUrl,
                  status.status == "ready" else {
                logger.info("Avatar not ready: \(status.status)")
                await MainActor.run {
                    withAnimation { showNoAvatarWarning = true }
                }
                return
            }
            avatarImageUrl = imageUrl
            resolvedAvatarId = status.avatarId
        } catch {
            logger.info("Avatar fetch failed: \(error)")
            await MainActor.run {
                withAnimation { showNoAvatarWarning = true }
            }
            return
        }

        // 3. Load interactive moments from API
        let vm = VODInteractionViewModel(
            repository: repositories.avatarMeshRepository
        )
        await vm.loadMoments(contentId: contentId)
        guard !vm.moments.isEmpty else {
            logger.info("No interactive moments for content")
            return
        }
        interactionVM = vm
        voiceService = VoiceInteractionService()
        logger.info(
            "Interactive moments enabled: \(vm.moments.count) moments"
        )
    }

    // MARK: - Shared Interaction Overlay (Phase 3 WS4)

    @ViewBuilder
    var sharedInteractionOverlay: some View {
        if showSharedInteraction, let vm = sharedVM {
            SharedInteractionOverlayView(viewModel: vm) {
                showSharedInteraction = false
                Task { await sharedVM?.endSharedInteraction() }
            }
            .transition(.move(edge: .trailing).combined(with: .opacity))
        }
    }
}
#endif
