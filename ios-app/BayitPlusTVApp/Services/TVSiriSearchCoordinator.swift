#if os(tvOS)
    import BayitCore
    import BayitMedia
    import Foundation
    import Intents

    /// Orchestrates Siri search integration for the tvOS app.
    /// - Batch-indexes content via NSUserActivity (CoreSpotlight
    ///   is unavailable on tvOS).
    /// - Donates INPlayMediaIntent on user interactions.
    /// - Supports English and Hebrew invocation phrases.
    @MainActor
    final class TVSiriSearchCoordinator {
        private let logger = BayitLogger(category: "TVSiriSearch")

        /// Keeps strong references so activities remain indexed.
        private var indexedActivities: [NSUserActivity] = []

        // MARK: - Batch Indexing

        /// Index content catalog for Siri search via NSUserActivity.
        /// Called once after authentication succeeds.
        func indexAllContent(repos: TVRepositoryProvider) async {
            logger.info("Starting batch NSUserActivity indexing")

            async let moviesTask: [NSUserActivity] =
                indexFeatured(repos: repos)
            async let channelsTask: [NSUserActivity] =
                indexChannels(repos: repos)
            async let radioTask: [NSUserActivity] =
                indexRadio(repos: repos)
            async let podcastsTask: [NSUserActivity] =
                indexPodcasts(repos: repos)
            async let audiobooksTask: [NSUserActivity] =
                indexAudiobooks(repos: repos)

            let all = await (
                moviesTask + channelsTask + radioTask
                    + podcastsTask + audiobooksTask
            )
            indexedActivities = all
            logger.info("Indexed \(all.count) items for Siri")
        }

        // MARK: - Interaction Donations

        /// Donate a "play content" activity for Siri learning.
        func donatePlay(
            contentId: String,
            contentTitle: String,
            contentType: String
        ) {
            let activity = makeActivity(
                type: ActivityType.playContent,
                title: "Play \(contentTitle)",
                userInfo: [
                    "contentId": contentId,
                    "contentTitle": contentTitle,
                    "contentType": contentType,
                ],
                identifier: "playContent-\(contentId)",
                phrase: "Play \(contentTitle)"
            )
            activity.becomeCurrent()

            donateMediaInteraction(
                contentId: contentId,
                contentTitle: contentTitle,
                contentType: contentType
            )

            let type = TVContentTypeMapper.map(contentType)
            TVPendingIntentManager.shared.recordPlayback(
                contentId: contentId,
                contentType: type
            )
        }

        /// Donate a search activity for Siri learning.
        func donateSearch(query: String) {
            let activity = makeActivity(
                type: ActivityType.searchContent,
                title: "Search for \(query)",
                userInfo: ["query": query],
                identifier: "searchContent-\(query)",
                phrase: nil
            )
            activity.becomeCurrent()
        }

        /// Donate a "resume watching" activity when playback pauses.
        func donateResume(
            contentId: String,
            contentTitle: String
        ) {
            let activity = makeActivity(
                type: ActivityType.resumeWatching,
                title: "Resume \(contentTitle)",
                userInfo: [
                    "contentId": contentId,
                    "contentTitle": contentTitle,
                ],
                identifier: "resumeWatching-\(contentId)",
                phrase: "Resume \(contentTitle)"
            )
            activity.becomeCurrent()
        }
    }

    // MARK: - Private

    extension TVSiriSearchCoordinator {
        private enum ActivityType {
            static let playContent = "tv.bayit.plus.playContent"
            static let searchContent = "tv.bayit.plus.searchContent"
            static let resumeWatching = "tv.bayit.plus.resumeWatching"
        }

        private func makeActivity(
            type: String,
            title: String,
            userInfo: [String: String],
            identifier _: String,
            phrase _: String?
        ) -> NSUserActivity {
            let activity = NSUserActivity(activityType: type)
            activity.title = title
            activity.isEligibleForSearch = true
            activity.userInfo = userInfo
            return activity
        }

        // MARK: - Content Indexing

        private func indexFeatured(
            repos: TVRepositoryProvider
        ) async -> [NSUserActivity] {
            do {
                let featured = try await repos.content.fetchFeatured()
                let items = featured.categories.flatMap(\.items)
                let activities = items.map { item in
                    makeActivity(
                        type: ActivityType.playContent,
                        title: item.title ?? item.id,
                        userInfo: [
                            "contentId": item.id,
                            "contentTitle": item.title ?? item.id,
                            "contentType": item.type ?? "movie",
                        ],
                        identifier: "play-\(item.id)",
                        phrase: nil
                    )
                }
                logger.info("Indexed \(activities.count) VOD items")
                return activities
            } catch {
                logger.error("Failed to index featured: \(error)")
                return []
            }
        }

        private func indexChannels(
            repos: TVRepositoryProvider
        ) async -> [NSUserActivity] {
            do {
                let response = try await repos.liveTV.fetchChannels(
                    cultureId: nil, category: nil
                )
                let activities = response.channels.map { ch in
                    makeActivity(
                        type: ActivityType.playContent,
                        title: ch.name ?? ch.id,
                        userInfo: [
                            "contentId": ch.id,
                            "contentTitle": ch.name ?? ch.id,
                            "contentType": "live",
                        ],
                        identifier: "play-\(ch.id)",
                        phrase: nil
                    )
                }
                logger.info("Indexed \(activities.count) channels")
                return activities
            } catch {
                logger.error("Failed to index channels: \(error)")
                return []
            }
        }

        private func indexRadio(
            repos: TVRepositoryProvider
        ) async -> [NSUserActivity] {
            do {
                let response = try await repos.radio.fetchStations(
                    cultureId: nil, genre: nil
                )
                let activities = response.stations.map { st in
                    makeActivity(
                        type: ActivityType.playContent,
                        title: st.name ?? st.id,
                        userInfo: [
                            "contentId": st.id,
                            "contentTitle": st.name ?? st.id,
                            "contentType": "radio",
                        ],
                        identifier: "play-\(st.id)",
                        phrase: nil
                    )
                }
                logger.info("Indexed \(activities.count) radio")
                return activities
            } catch {
                logger.error("Failed to index radio: \(error)")
                return []
            }
        }

        private func indexPodcasts(
            repos: TVRepositoryProvider
        ) async -> [NSUserActivity] {
            do {
                let response = try await repos.podcasts.fetchPodcasts(
                    category: nil, page: 1, limit: 100
                )
                let activities = response.shows.map { show in
                    makeActivity(
                        type: ActivityType.playContent,
                        title: show.title ?? show.id,
                        userInfo: [
                            "contentId": show.id,
                            "contentTitle": show.title ?? show.id,
                            "contentType": "podcast",
                        ],
                        identifier: "play-\(show.id)",
                        phrase: nil
                    )
                }
                logger.info("Indexed \(activities.count) podcasts")
                return activities
            } catch {
                logger.error("Failed to index podcasts: \(error)")
                return []
            }
        }

        private func indexAudiobooks(
            repos: TVRepositoryProvider
        ) async -> [NSUserActivity] {
            do {
                let response = try await repos.audiobook.fetchAll(
                    page: 1, pageSize: 100, genre: nil, author: nil
                )
                let books = response.items ?? []
                let activities = books.map { book in
                    makeActivity(
                        type: ActivityType.playContent,
                        title: book.title ?? book.id,
                        userInfo: [
                            "contentId": book.id,
                            "contentTitle": book.title ?? book.id,
                            "contentType": "audiobook",
                        ],
                        identifier: "play-\(book.id)",
                        phrase: nil
                    )
                }
                logger.info("Indexed \(activities.count) audiobooks")
                return activities
            } catch {
                logger.error("Failed to index audiobooks: \(error)")
                return []
            }
        }

        private func donateMediaInteraction(
            contentId: String,
            contentTitle: String,
            contentType: String
        ) {
            let mediaType: INMediaItemType =
                contentType == "live" ? .tvShow : .movie
            let mediaItem = INMediaItem(
                identifier: contentId,
                title: contentTitle,
                type: mediaType,
                artwork: nil
            )

            let intent = INPlayMediaIntent(
                mediaItems: [mediaItem],
                mediaContainer: nil,
                playShuffled: nil,
                playbackRepeatMode: .none,
                resumePlayback: false,
                playbackQueueLocation: .now,
                playbackSpeed: nil,
                mediaSearch: nil
            )
            intent.suggestedInvocationPhrase =
                "Play \(contentTitle)"

            let interaction = INInteraction(
                intent: intent, response: nil
            )
            interaction.donate()
        }
    }
#endif
