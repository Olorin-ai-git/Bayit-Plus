import BayitDesignSystem
import SwiftUI

/// Extension providing navigation helpers for CategoryRow.
extension CategoryRow {
    func navigateToItem(_ item: ContentItem) {
        let type = item.type?.lowercased() ?? ""
        let catName = category.name.lowercased()

        let ct = item.type?.lowercased() ?? ""
        if ct == "series" {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else if ct == "collection" || item.isCollectionParent == true {
            coordinator.navigate(to: .collectionDetail(collectionId: item.id))
        } else if type.contains("podcast") || catName.contains("podcast") {
            coordinator.navigate(to: .podcastDetail(showId: item.id))
        } else if type.contains("audiobook") || catName.contains("audiobook") {
            coordinator.navigate(to: .audiobookDetail(audiobookId: item.id))
        } else if type == "movie" || type == "vod"
            || catName.contains("movie") || catName.contains("film")
        {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        } else if type.contains("radio") || catName.contains("radio") {
            coordinator.navigate(to: .radio)
        } else if type.contains("live") || catName.contains("live") {
            coordinator.selectedTab = .liveTV
        } else {
            let contentType = ContentType(rawValue: item.type ?? "") ?? .movie
            coordinator.presentFullscreen(.player(contentId: item.id, contentType: contentType))
        }
    }

    func navigateToCategory() {
        let name = category.name.lowercased()
        if name.contains("podcast") {
            coordinator.selectedTab = .podcasts
        } else if name.contains("radio") {
            coordinator.navigate(to: .radio)
        } else if name.contains("live") {
            coordinator.selectedTab = .liveTV
        } else if name.contains("kid") || name.contains("children") {
            coordinator.navigate(to: .children)
        } else if name.contains("youngster") || name.contains("teen") {
            coordinator.navigate(to: .youngsters)
        } else if name.contains("judai") || name.contains("torah") {
            coordinator.navigate(to: .judaism)
        } else if name.contains("audiobook") {
            coordinator.navigate(to: .audiobooks)
        } else if name.contains("trend") || name.contains("hot") {
            coordinator.navigate(to: .trending)
        } else {
            coordinator.selectedTab = .vod
        }
    }
}
