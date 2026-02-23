#if os(tvOS)
    import BayitCore
    import BayitMedia
    import Foundation

    // MARK: - Stream Resolution

    extension TVAudioPlaybackManager {
        func resolveAndPlayRadio(stationId: String) async throws {
            let detail = try await radioRepository.fetchStationDetail(id: stationId)
            let stream = try await mediaRepository.fetchRadioStream(stationId: stationId)

            guard let urlString = stream.url, let streamURL = URL(string: urlString) else {
                logger.error("Radio stream URL is nil", context: ["stationId": stationId])
                resetState()
                return
            }

            let artworkURL: URL? = detail.logo.flatMap { URL(string: $0) }

            await beginPlayback(
                url: streamURL,
                title: detail.name ?? stationId,
                subtitle: detail.currentShow,
                artworkURL: artworkURL,
                contentType: .radio
            )
        }

        func resolveAndPlayPodcast(showId: String) async throws {
            let detail = try await podcastRepository.fetchPodcastDetail(id: showId)

            // Try latest episode audioUrl first, then fetch episodes list
            if let audioUrlStr = detail.latestEpisode?.audioUrl,
               let audioURL = URL(string: audioUrlStr)
            {
                let artworkURL: URL? = detail.cover.flatMap { URL(string: $0) }
                await beginPlayback(
                    url: audioURL,
                    title: detail.title ?? showId,
                    subtitle: detail.author,
                    artworkURL: artworkURL,
                    contentType: .podcast
                )
                return
            }

            // Fallback: fetch first episode
            let episodesResponse = try await podcastRepository.fetchEpisodes(
                showId: showId,
                page: 1,
                limit: 1
            )

            guard let episode = episodesResponse.episodes.first,
                  let audioUrlStr = episode.audioUrl,
                  let audioURL = URL(string: audioUrlStr)
            else {
                logger.warning("No playable episode found", context: ["showId": showId])
                resetState()
                return
            }

            let artworkURL: URL? = (episode.thumbnail ?? detail.cover).flatMap { URL(string: $0) }

            await beginPlayback(
                url: audioURL,
                title: episode.title ?? detail.title ?? showId,
                subtitle: detail.author,
                artworkURL: artworkURL,
                contentType: .podcast
            )
        }

        // MARK: - Playback

        func beginPlayback(
            url: URL,
            title: String,
            subtitle: String?,
            artworkURL: URL?,
            contentType: MediaContentType
        ) async {
            self.title = title
            self.subtitle = subtitle
            self.artworkURL = artworkURL

            mediaPlayer.load(url: url, contentType: contentType)

            // Load resume position for seekable content before starting playback
            if contentType.isSeekable, let contentId = activeContentId {
                let appContentType = contentType.toContentType
                let tracker = ProgressTracker(
                    repository: mediaRepository,
                    player: mediaPlayer,
                    contentId: contentId,
                    contentType: appContentType
                )
                progressTracker = tracker
                await tracker.loadResumePosition()

                mediaPlayer.play()
                if tracker.initialPosition > 0 {
                    await mediaPlayer.seek(to: tracker.initialPosition)
                    logger.info("Resumed TV audio from saved position", context: [
                        "contentId": contentId,
                        "position": String(format: "%.1f", tracker.initialPosition),
                    ])
                }
                tracker.startTracking()
            } else {
                mediaPlayer.play()
            }

            isLoading = false

            let metadata = NowPlayingMetadata(
                title: title,
                artist: subtitle,
                artworkURL: artworkURL,
                contentType: contentType,
                isLiveStream: contentType.isLive
            )
            nowPlayingService.update(
                metadata: metadata,
                currentTime: mediaPlayer.currentTime,
                duration: mediaPlayer.duration,
                rate: mediaPlayer.rate
            )

            remoteCommandService.delegate = self
            remoteCommandService.register()
            remoteCommandService.configureForContentType(contentType)

            logger.info("TV audio playback started", context: [
                "title": title,
                "contentType": contentType.rawValue,
            ])
        }

        func updateNowPlayingPosition() {
            nowPlayingService.updatePosition(
                currentTime: mediaPlayer.currentTime,
                rate: mediaPlayer.rate
            )
        }

        func resetState() {
            isActive = false
            isLoading = false
            title = nil
            subtitle = nil
            artworkURL = nil
            activeContentId = nil
            activeContentType = nil
        }
    }

    // MARK: - MediaContentType to ContentType Mapping

    extension MediaContentType {
        /// Maps MediaContentType back to app-layer ContentType for ProgressTracker.
        var toContentType: ContentType {
            switch self {
            case .radio: return .radio
            case .podcast: return .podcast
            case .audiobook: return .audiobook
            case .liveTV: return .live
            case .vod: return .movie
            }
        }
    }
#endif
