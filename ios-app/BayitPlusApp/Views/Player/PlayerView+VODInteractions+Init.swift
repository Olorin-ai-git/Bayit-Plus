#if os(iOS)
    import BayitCore
    import BayitDesignSystem
    import SwiftUI

    /// Extension on PlayerView providing interactive moments initialization,
    /// dialogue session management, and shared interaction overlay.
    extension PlayerView {
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
                      status.status == "ready"
                else {
                    logger.info("Avatar not ready: \(status.status)")
                    await MainActor.run {
                        withAnimation { showNoAvatarWarning = true }
                    }
                    return
                }
                avatarImageUrl = imageUrl
                resolvedAvatarId = status.avatarId
                hasVoiceClone = status.hasVoiceClone
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

            // 4. Check for interactive characters (enables Pause & Ask)
            let characters = try? await repositories.avatarMeshRepository
                .fetchInteractiveCharacters(contentId: contentId)
            let charactersAvailable = !(characters ?? []).isEmpty

            guard !vm.moments.isEmpty || charactersAvailable else {
                logger.info(
                    "No interactive moments or characters for content"
                )
                return
            }

            if !vm.moments.isEmpty {
                interactionVM = vm
            }
            hasInteractiveCharacters = charactersAvailable

            voiceService = VoiceInteractionService(
                webSocketManager: repositories.webSocketManager,
                configuration: repositories.configuration,
                authTokenProvider: repositories.authTokenProvider
            )
            logger.info(
                "Interactions enabled: \(vm.moments.count) moments, "
                    + "characters=\(charactersAvailable)"
            )
        }

        // MARK: - Dialogue Session Management

        func startPauseAskInteraction() async {
            if dialogueVM == nil {
                dialogueVM = AvatarDialogueViewModel(
                    repository: repositories.avatarMeshRepository
                )
            }
            await dialogueVM?.loadCharacters(contentId: contentId)
            viewModel.player.avPlayer.pause()
            showPauseAskOverlay = true
        }

        func dismissPauseAsk() async {
            viewModel.player.avPlayer.play()
            showPauseAskOverlay = false
            await dialogueVM?.endSession()
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

        func dismissDialogue() async {
            restoreVolume()
            showDialogueOverlay = false
            await dialogueVM?.endSession()
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
