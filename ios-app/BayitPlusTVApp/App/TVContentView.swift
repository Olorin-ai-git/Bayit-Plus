#if os(tvOS)
    import BayitAuth
    import BayitDesignSystem
    import BayitMedia
    import BayitNetworking
    import GameController
    import SwiftUI

    /// Root content view for the tvOS app.
    /// Shows splash on first launch, then auth flow or main tab view.
    /// Long-press Play/Pause on Siri Remote triggers the Bayit+ voice assistant.
    struct TVContentView: View {
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(AuthManager.self) private var authManager

        @State private var showVoiceAssistant = false
        @State private var isHandlingUnauthorized = false

        var body: some View {
            ZStack {
                DesignTokens.Colors.Background.primary
                    .ignoresSafeArea()

                if coordinator.showingSplash {
                    TVSplashView(
                        onFinished: {
                            withAnimation(.easeInOut(duration: 0.5)) {
                                coordinator.showingSplash = false
                            }
                        }
                    )
                    .transition(.opacity)
                } else if (coordinator.showingAuth || !authManager.isAuthenticated) && !coordinator.isAutoLoginInProgress {
                    TVSignInView(
                        onAuthSuccess: {
                            withAnimation {
                                coordinator.showingAuth = false
                            }
                        },
                        logger: TVAppAPILogger()
                    )
                    .transition(.opacity)
                } else {
                    TVMainTabView()
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut, value: coordinator.showingSplash)
            .animation(.easeInOut, value: coordinator.showingAuth)
            .fullScreenCover(item: fullscreenBinding) { route in
                fullscreenView(for: route)
            }
            .fullScreenCover(isPresented: $showVoiceAssistant) {
                TVVoiceAssistantSheet(
                    chatRepository: repos.chat,
                    onDismiss: { showVoiceAssistant = false }
                )
            }
            .onOpenURL { url in
                coordinator.handleDeepLink(url)
            }
            .onContinueUserActivity(
                "tv.bayit.plus.playContent"
            ) { activity in
                coordinator.handleUserActivity(activity)
            }
            .onContinueUserActivity(
                "tv.bayit.plus.searchContent"
            ) { activity in
                coordinator.handleUserActivity(activity)
            }
            .onContinueUserActivity(
                "tv.bayit.plus.resumeWatching"
            ) { activity in
                coordinator.handleUserActivity(activity)
            }
            .onChange(of: TVPendingIntentManager.shared.pendingRoute) {
                coordinator.handlePendingIntent()
            }
            .onChange(of: TVPendingIntentManager.shared.pendingTab) {
                coordinator.handlePendingIntent()
            }
            .onAppear { registerRemoteVoiceTrigger() }
            .onDisappear { unregisterRemoteVoiceTrigger() }
            .onChange(of: authManager.isAuthenticated) { _, isAuthenticated in
                if isAuthenticated {
                    withAnimation {
                        coordinator.showingAuth = false
                    }
                } else if !coordinator.showingSplash {
                    withAnimation {
                        coordinator.showingAuth = true
                    }
                }
            }
            .onReceive(
                NotificationCenter.default.publisher(for: APIClient.unauthorizedNotification)
            ) { _ in
                guard !isHandlingUnauthorized else { return }
                isHandlingUnauthorized = true
                Task {
                    defer { isHandlingUnauthorized = false }
                    do {
                        try await authManager.refreshToken()
                    } catch {
                        await authManager.signOut()
                    }
                }
            }
        }

        // MARK: - Fullscreen Routing

        private var fullscreenBinding: Binding<TVRoute?> {
            Binding(
                get: { coordinator.fullscreenRoute },
                set: { coordinator.fullscreenRoute = $0 }
            )
        }

        @ViewBuilder
        private func fullscreenView(for route: TVRoute) -> some View {
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
            case .voiceAssistant:
                TVVoiceAssistantSheet(
                    chatRepository: repos.chat,
                    onDismiss: { coordinator.dismissFullscreen() }
                )
            default:
                EmptyView()
                    .onAppear { coordinator.dismissFullscreen() }
            }
        }

        // MARK: - Play/Pause Long-Press Voice Trigger

        /// Register for Siri Remote Play/Pause long-press via Game Controller framework.
        /// A long-press (>0.5s) on the Play/Pause button opens the voice assistant.
        /// Normal short press is not intercepted (passes through to system).
        private func registerRemoteVoiceTrigger() {
            NotificationCenter.default.addObserver(
                forName: .GCControllerDidConnect,
                object: nil,
                queue: .main
            ) { notification in
                guard let controller = notification.object as? GCController,
                      let micro = controller.microGamepad else { return }
                setupLongPress(on: micro)
            }

            // Handle already-connected controllers
            for controller in GCController.controllers() {
                if let micro = controller.microGamepad {
                    setupLongPress(on: micro)
                }
            }
        }

        private func setupLongPress(on gamepad: GCMicroGamepad) {
            // The buttonMenu is the Play/Pause button on Siri Remote
            // We use pressedChangedHandler to detect long-press duration
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

        private func unregisterRemoteVoiceTrigger() {
            NotificationCenter.default.removeObserver(
                self,
                name: .GCControllerDidConnect,
                object: nil
            )
        }
    }
#endif
