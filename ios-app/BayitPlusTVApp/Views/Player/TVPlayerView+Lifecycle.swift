import BayitAuth
import BayitCore
import BayitMedia
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
        BayitLogger(category: "TVPlayerView").warning(
            "initializeViewModels called: isLive=\(isLive), contentId=\(contentId)"
        )
        if isLive, authManager.user?.isBetaUser == true {
            let vm = CatchUpViewModel(repository: repos.liveTV)
            state.catchUpVM = vm
            Task {
                await vm.checkAvailability(
                    channelId: channelId ?? contentId, isBetaUser: true
                )
            }
        }

        state.triviaVM = TriviaFactsViewModel(
            repository: repos.trivia, offlineCache: repos.offlineCache
        )

        if !isLive {
            Task {
                await state.triviaVM?.loadFacts(
                    contentId: contentId, language: state.selectedAILanguage
                )
            }
        }

        if !isLive {
            Task { await initializeInteractiveMoments() }
        }

        let dubbingWS = LiveDubbingWebSocketService(
            configuration: repos.configuration,
            authTokenProvider: repos.authTokenProvider
        )
        state.webSocketService = dubbingWS
        state.liveDubbingVM = LiveDubbingViewModel(
            repository: repos.liveDubbing,
            webSocketService: dubbingWS, authManager: authManager
        )

        if isLive {
            let subtitleWS = LiveSubtitlesWebSocketService(
                configuration: repos.configuration,
                authTokenProvider: repos.authTokenProvider
            )
            state.liveSubtitlesVM = LiveSubtitlesViewModel(
                webSocketService: subtitleWS
            )
        }
    }

    // MARK: - Cleanup

    @MainActor
    func cleanup() {
        state.progressTrackingTask?.cancel()
        state.progressTrackingTask = nil
        Task { await saveProgress() }
        mediaPlayer.pause()
        state.liveDubbingVM?.cleanup()
        state.liveSubtitlesVM?.cleanup()
        state.triviaVM?.disconnectLiveTrivia()
        state.catchUpVM?.reset()
        state.catchUpVM = nil
        state.interactionVM = nil
        state.voiceService = nil
        if state.dialogueVM?.isActive == true {
            Task { await state.dialogueVM?.endSession() }
        }
        state.dialogueVM = nil
        if state.sharedVM?.isActive == true {
            Task { await state.sharedVM?.endSharedInteraction() }
        }
        state.sharedVM = nil
        state.showSharedInteraction = false
    }
}
