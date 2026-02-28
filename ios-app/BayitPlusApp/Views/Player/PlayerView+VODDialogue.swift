#if os(iOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Extension on PlayerView providing dialogue, pause-ask overlays,
    /// and session management for VOD interactions.
    extension PlayerView {
        // MARK: - Free-Form Dialogue Overlay

        @ViewBuilder
        var dialogueOverlayView: some View {
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
        var pauseAskOverlayView: some View {
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
            }
        }

        // MARK: - Shared Interaction Overlay (Phase 3 WS4)

        @ViewBuilder
        var sharedInteractionOverlayView: some View {
            if showSharedInteraction, let vm = sharedVM {
                SharedInteractionOverlayView(viewModel: vm) {
                    showSharedInteraction = false
                    Task { await sharedVM?.endSharedInteraction() }
                }
                .transition(.move(edge: .trailing).combined(with: .opacity))
            }
        }

        // MARK: - Session Management

        func startPauseAskFlow() async {
            if dialogueVM == nil {
                dialogueVM = AvatarDialogueViewModel(
                    repository: repositories.avatarMeshRepository
                )
            }
            await dialogueVM?.loadCharacters(contentId: contentId)
            viewModel.player.avPlayer.pause()
            showPauseAskOverlay = true
        }

        func dismissPauseAskFlow() async {
            viewModel.player.avPlayer.play()
            showPauseAskOverlay = false
            await dialogueVM?.endSession()
        }

        func openCharacterSheetFlow() async {
            if dialogueVM == nil {
                dialogueVM = AvatarDialogueViewModel(
                    repository: repositories.avatarMeshRepository
                )
            }
            await dialogueVM?.loadCharacters(contentId: contentId)
            showCharacterSheet = true
        }

        func startDialogueFlow(with character: ContentCharacter) async {
            guard let avatarId = resolvedAvatarId else { return }

            await dialogueVM?.startSession(
                contentId: contentId,
                avatarId: avatarId,
                character: character,
                currentTimestamp: viewModel.player.currentTime
            )
            duckVolume()
            showDialogueOverlay = true
        }

        func dismissDialogueFlow() async {
            restoreVolume()
            showDialogueOverlay = false
            await dialogueVM?.endSession()
        }
    }
#endif
