import BayitAuth
import BayitBYOC
import BayitCore
import BayitMedia
import BayitNetworking
import SwiftUI

/// Stream resolution, view model initialization, and cleanup on disappear.
extension TVPlayerView {
    // MARK: - Stream Resolution

    func resolveAndPlay() async {
        state.isResolvingStream = true
        state.streamError = nil

        do {
            let streamURL = try await fetchStreamURL()
            guard let url = URL(string: streamURL) else {
                state.streamError = "Invalid stream URL received"
                state.isResolvingStream = false
                return
            }
            mediaPlayer.load(url: url, contentType: contentType)
            // Call avPlayer.play() directly because MediaPlayer.play() guards
            // on state.canPlay which excludes .loading. AVPlayer handles
            // pre-ready playback natively and will auto-play once buffered.
            mediaPlayer.avPlayer.play()
            state.isResolvingStream = false

            await loadAvailableLanguages()

            if !isLive {
                await loadResumePosition()
                await loadSubtitlePreference()

                if state.initialPosition > 0 {
                    await mediaPlayer.seek(to: state.initialPosition)
                }

                startProgressTracking()
            }
        } catch let error as StreamResolutionError {
            state.streamError = error.errorDescription
                ?? localization.t("player.streamLoadFailed")
            state.isResolvingStream = false
        } catch {
            // Auth errors: dismiss the player so the global 401 handler
            // in TVContentView can navigate to the login screen.
            if error.isAuthenticationError {
                state.isResolvingStream = false
                dismiss()
                return
            }
            if let message = error.userFriendlyMessage {
                state.streamError = message
            }
            state.isResolvingStream = false
        }
    }

    func fetchStreamURL() async throws -> String {
        if let directUrl, !directUrl.isEmpty {
            return directUrl
        }

        switch contentType {
        case .liveTV:
            let channel = try await repos.liveTV.fetchChannelDetail(
                id: channelId ?? contentId
            )
            let stream = try await repos.media.fetchLiveStream(
                channelId: channelId ?? contentId
            )
            guard let url = stream.url ?? channel.streamUrl, !url.isEmpty else {
                throw StreamResolutionError.noURL
            }
            return url

        case .radio:
            let stream = try await repos.media.fetchRadioStream(
                stationId: contentId
            )
            guard let url = stream.url, !url.isEmpty else {
                throw StreamResolutionError.noURL
            }
            return url

        case .podcast:
            let detail = try await repos.podcasts.fetchPodcastDetail(
                id: contentId
            )
            let audioURLStr = detail.episodes?.first?.audioUrl
                ?? detail.latestEpisode?.audioUrl
            guard let url = audioURLStr, !url.isEmpty else {
                throw StreamResolutionError.noURL
            }
            return url

        case .vod:
            let detail = try await repos.content.fetchContentDetail(
                id: contentId
            )
            let stream = try await repos.media.fetchStream(
                contentId: contentId, quality: nil
            )
            guard let url = stream.url ?? detail.streamUrl ?? detail.directUrl
                ?? stream.streamUrl ?? stream.directUrl, !url.isEmpty
            else {
                throw StreamResolutionError.noURL
            }
            return url

        case .audiobook:
            let audiobook = try await repos.audiobook.fetchWithChapters(
                id: contentId
            )
            let url = audiobook.chapters?.first?.streamUrl
                ?? audiobook.streamUrl
            guard let url, !url.isEmpty else {
                throw StreamResolutionError.noURL
            }
            return url
        }
    }

    // MARK: - View Model Initialization

    func initializeViewModels() {
        resolveBYOCCapabilities()

        if isLive {
            let vm = CatchUpViewModel(repository: repos.liveTV, localization: localization)
            state.catchUpVM = vm
            Task {
                await vm.checkAvailability(channelId: channelId ?? contentId)
            }
        }

        let caps = state.byocCapabilities
        let isBYOC = caps != .none

        if !isBYOC || caps.trivia {
            if state.triviaVM == nil {
                state.triviaVM = TriviaFactsViewModel(
                    repository: repos.trivia, offlineCache: repos.offlineCache
                )
            }
            if !isLive {
                Task {
                    await state.triviaVM?.loadFacts(
                        contentId: contentId, language: state.selectedAILanguage
                    )
                }
            }
        }

        if !isLive, !isBYOC || caps.trivia {
            Task { await initializeInteractiveMoments() }
        }

        if !isBYOC || caps.dubbing || caps.audioOverlayOnly {
            let dubbingWS = LiveDubbingWebSocketService(
                webSocketManager: repos.webSocketManager,
                configuration: repos.configuration,
                authTokenProvider: repos.authTokenProvider,
                localization: localization
            )
            state.webSocketService = dubbingWS
            let dubbingVM = LiveDubbingViewModel(
                repository: repos.liveDubbing,
                webSocketService: dubbingWS, authManager: authManager
            )
            dubbingVM.byocStreamUrl = state.byocStreamUrl
            state.liveDubbingVM = dubbingVM
        }

        if isLive, !isBYOC || caps.liveSubtitles {
            let subtitleWS = LiveSubtitlesWebSocketService(
                webSocketManager: repos.webSocketManager,
                configuration: repos.configuration,
                authTokenProvider: repos.authTokenProvider,
                localization: localization
            )
            let subtitleVM = LiveSubtitlesViewModel(
                webSocketService: subtitleWS
            )
            subtitleVM.byocStreamUrl = state.byocStreamUrl
            state.liveSubtitlesVM = subtitleVM
        }
    }

    private func resolveBYOCCapabilities() {
        guard let urlString = directUrl, let url = URL(string: urlString) else { return }
        let caps = BYOCAICapabilityResolver.resolve(streamURL: url, manager: byocManager)
        guard caps != .none else { return }
        state.byocCapabilities = caps
        state.byocStreamUrl = urlString
    }
}
