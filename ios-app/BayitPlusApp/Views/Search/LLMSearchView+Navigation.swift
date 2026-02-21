import Foundation
import SwiftUI

// MARK: - Navigation & Sample Queries

extension LLMSearchView {
    var sampleQueries: [String] {
        [
            "Family-friendly Israeli comedies",
            "Documentaries about Jerusalem",
            "Hebrew music podcasts",
            "Drama series from 2024",
        ]
    }

    func navigateToItem(_ item: ContentItem) {
        let ct = item.type?.lowercased() ?? ""
        if ct == "series" {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else if ct == "collection" || item.isCollectionParent == true {
            coordinator.navigate(to: .collectionDetail(collectionId: item.id))
        } else if ct == "audiobook" {
            coordinator.navigate(to: .audiobookDetail(audiobookId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }
}
