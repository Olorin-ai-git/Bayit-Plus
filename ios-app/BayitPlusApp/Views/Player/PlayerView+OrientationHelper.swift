import BayitCore
import BayitMedia
import BayitVoice
import SwiftUI

/// Extension on PlayerView providing orientation management,
/// media content type mapping, interaction navigation helpers,
/// playback rate label, and view model initialization.
extension PlayerView {
    // MARK: - Orientation

    func requestLandscapeOrientation() {
        guard viewModel.contentType != .live, viewModel.contentType != .liveTV else { return }
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            let preferences = UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: .landscape)
            scene.requestGeometryUpdate(preferences) { _ in }
        }
    }

    func restorePortraitOrientation() {
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene {
            let preferences = UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: .all)
            scene.requestGeometryUpdate(preferences) { _ in }
        }
    }

    // MARK: - Media Content Type

    var mediaContentType: MediaContentType {
        switch contentType {
        case .live, .liveTV: return .liveTV
        case .radio: return .radio
        case .podcast: return .podcast
        case .audiobook: return .audiobook
        case .movie, .series, .episode: return .vod
        }
    }

    // MARK: - Interaction Navigation

    var sortedMoments: [InteractiveMoment] {
        interactionVM?.moments.sorted { $0.timestamp < $1.timestamp } ?? []
    }

    var previousInteractionAction: (() -> Void)? {
        guard let moment = sortedMoments.last(where: {
            $0.timestamp < viewModel.player.currentTime - interactionRewindThreshold
        }) else { return nil }
        return {
            let t = max(0, moment.timestamp - interactionSeekOffset)
            Task { await viewModel.player.seek(to: t) }
        }
    }

    var nextInteractionAction: (() -> Void)? {
        guard let moment = sortedMoments.first(where: {
            $0.timestamp > viewModel.player.currentTime
        }) else { return nil }
        return {
            let t = max(0, moment.timestamp - interactionSeekOffset)
            Task { await viewModel.player.seek(to: t) }
        }
    }

    // MARK: - Playback Rate Label

    var playbackRateLabel: String {
        let rate = viewModel.player.rate
        if rate == 1.0 { return "1x" }
        if rate == floor(rate) { return "\(Int(rate))x" }
        return String(format: "%.1fx", rate)
    }

    // MARK: - View Model Initialization

    func initializeViewModels() {
        triviaVM = TriviaFactsViewModel(
            repository: repositories.trivia,
            offlineCache: repositories.offlineCache
        )

        if !mediaContentType.isLive {
            Task {
                await triviaVM?.loadFacts(
                    contentId: contentId,
                    language: selectedAILanguage
                )
            }
            Task { await initializeInteractiveMoments() }
        }

        if mediaContentType.isLive,
           authManager.user?.isBetaUser == true
        {
            let vm = CatchUpViewModel(repository: repositories.liveTV)
            catchUpVM = vm
            Task {
                await vm.checkAvailability(
                    channelId: contentId,
                    isBetaUser: true
                )
            }
        }

        if mediaContentType.isLive {
            let dubbingWS = LiveDubbingWebSocketService(
                webSocketManager: repositories.webSocketManager,
                configuration: repositories.configuration,
                authTokenProvider: repositories.authTokenProvider
            )
            liveDubbingVM = LiveDubbingViewModel(
                repository: repositories.liveDubbing,
                webSocketService: dubbingWS
            )

            let subtitleWS = LiveSubtitlesWebSocketService(
                webSocketManager: repositories.webSocketManager,
                configuration: repositories.configuration,
                authTokenProvider: repositories.authTokenProvider
            )
            liveSubtitlesVM = LiveSubtitlesViewModel(
                webSocketService: subtitleWS
            )
        }
    }
}
