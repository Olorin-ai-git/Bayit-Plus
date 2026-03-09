#if os(tvOS)
    import BayitBYOC
    import BayitMedia
    import GameController
    import SwiftUI

    // MARK: - Fullscreen Routing + Profile + Voice Trigger

    extension TVContentView {
        var fullscreenBinding: Binding<TVRoute?> {
            Binding(
                get: { coordinator.fullscreenRoute },
                set: { coordinator.fullscreenRoute = $0 }
            )
        }

        @ViewBuilder
        func fullscreenView(for route: TVRoute) -> some View {
            switch route {
            case let .player(contentId, contentType, channelId, directUrl):
                TVPlayerView(
                    contentId: contentId,
                    contentType: contentType,
                    channelId: channelId,
                    directUrl: directUrl
                )
            case let .movieDetail(movieId):
                TVMovieDetailView(movieId: movieId)
            case let .actorDetail(actorName):
                TVActorDetailView(actorName: actorName)
            case let .collectionDetail(collectionId):
                TVCollectionDetailView(collectionId: collectionId)
            case let .seriesDetail(seriesId):
                TVSeriesDetailView(seriesId: seriesId)
            case let .podcastDetail(showId):
                TVPodcastDetailView(showId: showId)
            case let .audiobookDetail(audiobookId):
                TVAudiobookDetailView(audiobookId: audiobookId)
            case .audiobooks:
                TVAudiobooksView()
            case .audiobookBrowse:
                TVAudiobookBrowseView()
            case .podcastBrowse:
                TVPodcastBrowseView()
            case .voiceAssistant:
                TVVoiceAssistantSheet(
                    chatRepository: repos.chat,
                    onDismiss: { coordinator.dismissFullscreen() }
                )
            case let .byocDetail(item):
                TVBYOCDetailView(item: item)
            default:
                EmptyView()
                    .onAppear { coordinator.dismissFullscreen() }
            }
        }

        // MARK: - Profile & Onboarding

        func checkOnboardingNeeded(profileId: String) {
            let key = "tv.bayit.plus.onboarding.\(profileId).completed"
            #if DEBUG
                UserDefaults.standard.set(false, forKey: key)
                coordinator.showingOnboarding = true
            #else
                let completed = UserDefaults.standard.bool(forKey: key)
                coordinator.showingOnboarding = !completed
            #endif
        }

        func handleSystemUserChange() {
            coordinator.profileSelected = false
            coordinator.selectedProfileId = nil
            coordinator.showingOnboarding = false
            Task {
                await authManager.signOut()
            }
        }

        // MARK: - Play/Pause Long-Press Voice Trigger

        func registerRemoteVoiceTrigger() {
            NotificationCenter.default.addObserver(
                forName: .GCControllerDidConnect,
                object: nil,
                queue: .main
            ) { notification in
                guard let controller = notification.object as? GCController,
                      let micro = controller.microGamepad else { return }
                setupLongPress(on: micro)
            }
            for controller in GCController.controllers() {
                if let micro = controller.microGamepad {
                    setupLongPress(on: micro)
                }
            }
        }

        func setupLongPress(on gamepad: GCMicroGamepad) {
            var pressStart: Date?
            gamepad.buttonX.pressedChangedHandler = { _, _, pressed in
                if pressed {
                    pressStart = Date()
                } else if let start = pressStart {
                    let duration = Date().timeIntervalSince(start)
                    pressStart = nil
                    if duration >= 0.8 {
                        Task { @MainActor in
                            showVoiceAssistant = true
                        }
                    }
                }
            }
        }

        func unregisterRemoteVoiceTrigger() {
            NotificationCenter.default.removeObserver(
                self,
                name: .GCControllerDidConnect,
                object: nil
            )
        }
    }
#endif
