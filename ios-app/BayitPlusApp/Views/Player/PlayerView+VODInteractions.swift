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
               let imgUrl = avatarImageUrl
            {
                InteractiveMomentOverlayView(
                    avatarVideoUrl: videoUrl,
                    avatarImageUrl: imgUrl,
                    characterVideoUrl: moment.characterResponseVideoUrl,
                    characterImageUrl: moment.characterFrameUrl,
                    onDismiss: { viewModel.player.avPlayer.play(); vm.dismiss() }
                )
                .onAppear { viewModel.player.avPlayer.pause() }
                .walkthroughTarget(id: "discover_vod_moments_step2")
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
               let imgUrl = avatarImageUrl
            {
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

        // MARK: - Pause & Ask Overlay

        @ViewBuilder
        var pauseAskOverlay: some View {
            if showPauseAskOverlay,
               let vm = dialogueVM,
               let imgUrl = avatarImageUrl
            {
                PauseAskDialogueOverlayView(
                    avatarImageUrl: imgUrl,
                    avatarId: resolvedAvatarId,
                    contentId: contentId,
                    currentTimestamp: viewModel.player.currentTime,
                    characters: vm.availableCharacters,
                    viewModel: vm,
                    voiceService: voiceService,
                    onDismiss: {
                        Task { await dismissPauseAsk() }
                    }
                )
                .walkthroughTarget(id: "discover_pause_ask_step4")
                .walkthroughTarget(id: "discover_ai_companion_step4")
                .walkthroughTarget(id: "discover_cultural_context_step2")
            }
        }

        // Action methods defined in PlayerView+VODInteractions+Init.swift
    }
#endif
