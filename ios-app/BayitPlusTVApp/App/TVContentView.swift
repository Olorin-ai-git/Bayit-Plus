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
            } else if coordinator.showingAuth {
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
        .onAppear { registerRemoteVoiceTrigger() }
        .onDisappear { unregisterRemoteVoiceTrigger() }
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
        case .player(let contentId, let contentType, let channelId):
            TVPlayerView(
                contentId: contentId,
                contentType: contentType,
                channelId: channelId
            )
        case .movieDetail(let movieId):
            TVMovieDetailView(movieId: movieId)
        case .collectionDetail(let collectionId):
            TVCollectionDetailView(collectionId: collectionId)
        case .seriesDetail(let seriesId):
            TVSeriesDetailView(seriesId: seriesId)
        case .podcastDetail(let showId):
            TVPodcastDetailView(showId: showId)
        case .audiobookDetail(let audiobookId):
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
