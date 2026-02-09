#if os(tvOS)
import BayitCore
import Foundation
import TVServices

/// Top Shelf content provider for the Bayit+ tvOS app.
/// Displays continue watching items and trending content
/// in the Apple TV Top Shelf area.
final class TopShelfProvider: TVTopShelfContentProvider {

    private let logger = BayitLogger(category: "TopShelf")

    override func loadTopShelfContent() async -> TVTopShelfContent? {
        let sections = await loadSections()

        guard !sections.isEmpty else {
            logger.info("No Top Shelf content available")
            return nil
        }

        let content = TVTopShelfSectionedContent(sections: sections)
        return content
    }

    // MARK: - Section Loading

    private func loadSections() async -> [TVTopShelfItemCollection<TVTopShelfSectionedItem>] {
        var sections: [TVTopShelfItemCollection<TVTopShelfSectionedItem>] = []

        let continueWatching = buildContinueWatchingSection()
        if !continueWatching.items.isEmpty {
            sections.append(continueWatching)
        }

        let trending = buildTrendingSection()
        if !trending.items.isEmpty {
            sections.append(trending)
        }

        return sections
    }

    private func buildContinueWatchingSection() -> TVTopShelfItemCollection<TVTopShelfSectionedItem> {
        let items: [TVTopShelfSectionedItem] = []
        let collection = TVTopShelfItemCollection(items: items)
        collection.title = "Continue Watching"
        return collection
    }

    private func buildTrendingSection() -> TVTopShelfItemCollection<TVTopShelfSectionedItem> {
        let items: [TVTopShelfSectionedItem] = []
        let collection = TVTopShelfItemCollection(items: items)
        collection.title = "Trending"
        return collection
    }

    // MARK: - Item Builders

    func buildSectionedItem(
        id: String,
        title: String,
        imageURL: URL?
    ) -> TVTopShelfSectionedItem {
        let item = TVTopShelfSectionedItem(identifier: id)
        item.title = title

        if let imageURL {
            item.setImageURL(imageURL, for: .screenScale1x)
            item.setImageURL(imageURL, for: .screenScale2x)
        }

        let components = URLComponents(string: "bayitplus://content/\(id)")
        if let url = components?.url {
            item.playAction = TVTopShelfAction(url: url)
            item.displayAction = TVTopShelfAction(url: url)
        }

        return item
    }
}
#endif
