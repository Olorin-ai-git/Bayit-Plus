import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

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
    }
}
