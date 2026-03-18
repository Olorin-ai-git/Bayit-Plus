import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

// MARK: - TVHomeView Greeting

extension TVHomeView {
    var greetingSection: some View {
        Group {
            if let name = coordinator.selectedProfileName, !name.isEmpty {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    Text("\(timeOfDayGreeting), \(name)")
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()

                    TVHomeStyleToggle(
                        isCinematic: prefs.isCinematicHome,
                        onToggle: {
                            withAnimation(.easeInOut(duration: 0.3)) {
                                prefs.homepageStyle = prefs.isCinematicHome
                                    ? "classic" : "cinematic"
                            }
                        }
                    )
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.top, TVDesignTokens.Spacing.md)
            }
        }
    }

    private var timeOfDayGreeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5 ..< 12:
            return localization.t("greeting.morning")
        case 12 ..< 17:
            return localization.t("greeting.afternoon")
        case 17 ..< 21:
            return localization.t("greeting.evening")
        default:
            return localization.t("greeting.night")
        }
    }
}

// MARK: - TVHomeView Navigation & Utility Helpers

extension TVHomeView {
    func navigateToCategoryItem(_ item: ContentItem, section: TVHomeSection) {
        let ct = item.type?.lowercased() ?? ""
        if ct == "series" {
            coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
        } else if ct == "collection" || item.isCollectionParent == true {
            coordinator.fullscreenRoute = .collectionDetail(collectionId: item.id)
        } else {
            switch section {
            case .podcasts:
                coordinator.fullscreenRoute = .podcastDetail(showId: item.id)
            case .audiobooks:
                coordinator.fullscreenRoute = .audiobookDetail(audiobookId: item.id)
            case .series, .israeliSeries:
                coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
            case .movies, .israeliMovies, .kids, .youngsters, .music, .documentary:
                coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
            default:
                coordinator.presentPlayer(
                    contentId: item.id,
                    contentType: TVContentTypeMapper.map(item.type)
                )
            }
        }
    }

    func loadFeaturedCollections() async {
        do {
            featuredCollections = try await repos.content.fetchCollectionRecommendations()
        } catch {
            // Collection banner is optional - fail silently
        }
    }

    /// Maps a spotlight item to the appropriate detail route.
    func detailRoute(for item: SpotlightItem) -> TVRoute {
        let type = item.type?.lowercased() ?? ""
        switch type {
        case "series":
            return .seriesDetail(seriesId: item.id)
        case "podcast", "podcast_episode":
            return .podcastDetail(showId: item.id)
        case "audiobook", "audiobook_chapter":
            return .audiobookDetail(audiobookId: item.id)
        default:
            return .movieDetail(movieId: item.id)
        }
    }

    /// Returns placeholder icon for content type
    func placeholderIcon(for section: TVHomeSection) -> String {
        switch section {
        case .liveTV: return "tv"
        case .israeliMovies, .movies: return "film"
        case .israeliSeries, .series: return "tv.fill"
        case .kids, .youngsters: return "figure.2"
        case .music: return "music.note"
        case .documentary: return "doc.text.image"
        case .podcasts: return "mic.fill"
        case .audiobooks: return "headphones"
        default: return "film"
        }
    }

    /// Cache continue watching and trending data for the Top Shelf extension.
    func cacheTopShelfData() {
        guard let vm = viewModel else { return }

        let continueItems = vm.continueWatching.prefix(10).map { item in
            TopShelfCachedItem(id: item.id, title: item.title ?? localization.t("common.untitled"), imageURL: item.thumbnail)
        }
        TopShelfDataProvider.cacheContinueWatching(Array(continueItems))

        let trendingItems = vm.trendingContent.prefix(10).map { item in
            TopShelfCachedItem(id: item.id, title: item.title, imageURL: nil)
        }
        TopShelfDataProvider.cacheTrending(trendingItems)

        let liveItems = vm.liveChannels.prefix(10).map { channel in
            TopShelfCachedItem(
                id: channel.id,
                title: channel.name ?? localization.t("liveTV.channel"),
                imageURL: channel.logo ?? channel.thumbnail
            )
        }
        TopShelfDataProvider.cacheLiveChannels(liveItems)
    }
}
