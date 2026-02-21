import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Navigation & Sample Queries

extension TVLLMSearchView {
    var sampleQueries: [String] {
        [
            localization.t("search.exampleQuery1"),
            localization.t("search.exampleQuery2"),
            localization.t("search.exampleQuery3"),
            localization.t("search.exampleQuery4"),
        ]
    }

    func navigateToItem(_ item: ContentItem) {
        let itemType = item.type?.lowercased() ?? ""
        switch itemType {
        case "podcast":
            coordinator.fullscreenRoute = .podcastDetail(showId: item.id)
        case "live":
            coordinator.presentPlayer(contentId: item.id, contentType: .liveTV)
        case "radio":
            coordinator.presentPlayer(contentId: item.id, contentType: .radio)
        case "series":
            coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
        case "collection":
            coordinator.fullscreenRoute = .collectionDetail(collectionId: item.id)
        case "audiobook":
            coordinator.fullscreenRoute = .audiobookDetail(audiobookId: item.id)
        default:
            coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
        }
    }
}
