#if os(iOS)
    import AVFoundation
    import AVKit
    import BayitAuth
    import BayitCore
    import BayitDesignSystem
    import SwiftUI

    // MARK: - PauseAskDialogueOverlayView Action Extensions

    extension PauseAskDialogueOverlayView {
        func selectCharacter(_ character: ContentCharacter) async {
            if viewModel.sessionId != nil {
                viewModel.selectedCharacter = character
                phase = .input
                return
            }
            guard let profileId = authManager.activeProfile?.id,
                  let avatarId = avatarId
            else {
                logger.error("Missing profileId or avatarId for session start")
                return
            }
            await viewModel.startSession(
                contentId: contentId,
                profileId: profileId,
                avatarId: avatarId,
                character: character,
                currentTimestamp: currentTimestamp
            )
            guard viewModel.sessionId != nil else {
                logger.error("Failed to start Pause & Ask session")
                return
            }
            phase = .input
        }

        func transcribeAndSend(audioData: Data) {
            phase = .polishing

            Task {
                guard let sessionId = viewModel.sessionId else {
                    logger.error("No session ID for transcription")
                    phase = .input
                    return
                }

                do {
                    let result = try await viewModel.repository
                        .transcribeAudio(
                            sessionId: sessionId,
                            audioData: audioData
                        )
                    guard !result.transcript.isEmpty else {
                        logger.info("Transcription returned empty text")
                        phase = .input
                        return
                    }
                    messageText = result.transcript
                    sendQuestion()
                } catch {
                    logger.error(
                        "Transcription failed: \(error.localizedDescription)"
                    )
                    phase = .input
                }
            }
        }

        func sendQuestion() {
            let text = messageText
            messageText = ""
            phase = .polishing

            Task {
                let response = await viewModel.sendPauseAskMessage(text)
                guard let response else {
                    logger.error("Pause & Ask returned nil response")
                    phase = .input
                    return
                }
                lastResponse = response
                await playUserVideo(response)
            }
        }

        func playUserVideo(_ response: PauseAskResponse) async {
            guard !response.userAnimatedVideoUrl.isEmpty,
                  let url = URL(string: response.userAnimatedVideoUrl)
            else {
                await playCharacterVideo(response)
                return
            }

            cleanupUserPlayer()
            let player = AVPlayer(url: url)
            player.automaticallyWaitsToMinimizeStalling = true
            userPlayer = player
            phase = .userSpeaking

            userEndObserver = NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: player.currentItem, queue: .main
            ) { [weak player] _ in
                guard player != nil else { return }
                Task { @MainActor in
                    cleanupUserPlayer()
                    phase = .transition
                    try? await Task.sleep(for: .seconds(transitionDelay))
                    await playCharacterVideo(response)
                }
            }

            guard let item = player.currentItem else {
                logger.error("User player has no current item")
                await playCharacterVideo(response)
                return
            }

            userStatusObserver = item.observe(
                \.status, options: [.initial, .new]
            ) { [weak player] observedItem, _ in
                Task { @MainActor in
                    switch observedItem.status {
                    case .readyToPlay:
                        withAnimation(.easeIn(duration: 0.3)) {
                            isUserVideoReady = true
                        }
                        player?.play()
                    case .failed:
                        logger.error(
                            "User video failed to load: "
                                + "\(observedItem.error?.localizedDescription ?? "unknown")"
                        )
                        cleanupUserPlayer()
                        await playCharacterVideo(response)
                    default:
                        break
                    }
                }
            }
        }

        func playCharacterVideo(_ response: PauseAskResponse) async {
            guard let url = URL(string: response.characterAnimatedVideoUrl) else {
                phase = .idle
                return
            }

            cleanupCharacterPlayer()
            let player = AVPlayer(url: url)
            player.automaticallyWaitsToMinimizeStalling = true
            characterPlayer = player
            phase = .characterSpeaking

            characterEndObserver = NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: player.currentItem, queue: .main
            ) { [weak player] _ in
                guard player != nil else { return }
                Task { @MainActor in
                    cleanupCharacterPlayer()
                    phase = .idle
                }
            }

            guard let item = player.currentItem else {
                logger.error("Character player has no current item")
                phase = .idle
                return
            }

            characterStatusObserver = item.observe(
                \.status, options: [.initial, .new]
            ) { [weak player] observedItem, _ in
                Task { @MainActor in
                    switch observedItem.status {
                    case .readyToPlay:
                        withAnimation(.easeIn(duration: 0.3)) {
                            isCharacterVideoReady = true
                        }
                        player?.play()
                    case .failed:
                        logger.error(
                            "Character video failed to load: "
                                + "\(observedItem.error?.localizedDescription ?? "unknown")"
                        )
                        cleanupCharacterPlayer()
                        phase = .idle
                    default:
                        break
                    }
                }
            }
        }

        func cleanupUserPlayer() {
            if let obs = userEndObserver {
                NotificationCenter.default.removeObserver(obs)
                userEndObserver = nil
            }
            userStatusObserver?.invalidate()
            userStatusObserver = nil
            userPlayer?.pause()
            userPlayer = nil
            isUserVideoReady = false
        }

        func cleanupCharacterPlayer() {
            if let obs = characterEndObserver {
                NotificationCenter.default.removeObserver(obs)
                characterEndObserver = nil
            }
            characterStatusObserver?.invalidate()
            characterStatusObserver = nil
            characterPlayer?.pause()
            characterPlayer = nil
            isCharacterVideoReady = false
        }
    }
#endif
