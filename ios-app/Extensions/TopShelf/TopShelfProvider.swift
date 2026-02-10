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
        let cached = loadCachedItems(forKey: TopShelfConstants.continueWatchingKey)
        let items = cached.map { cachedItem in
            buildSectionedItem(
                id: cachedItem.id,
                title: cachedItem.title,
                imageURL: cachedItem.imageURL.flatMap { URL(string: $0) }
            )
        }
        let collection = TVTopShelfItemCollection(items: items)
        collection.title = "Continue Watching"
        return collection
    }

    private func buildTrendingSection() -> TVTopShelfItemCollection<TVTopShelfSectionedItem> {
        let cached = loadCachedItems(forKey: TopShelfConstants.trendingKey)
        let items = cached.map { cachedItem in
            buildSectionedItem(
                id: cachedItem.id,
                title: cachedItem.title,
                imageURL: cachedItem.imageURL.flatMap { URL(string: $0) }
            )
        }
        let collection = TVTopShelfItemCollection(items: items)
        collection.title = "Trending"
        return collection
    }

    private func loadCachedItems(forKey key: String) -> [TopShelfCachedItem] {
        guard let defaults = UserDefaults(suiteName: TopShelfConstants.appGroupID),
              let data = defaults.data(forKey: key) else { return [] }
        do {
            return try JSONDecoder().decode([TopShelfCachedItem].self, from: data)
        } catch {
            logger.error("Failed to decode Top Shelf cache for \(key): \(error)")
            return []
        }
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

// MARK: - Shared Types (mirrored from TopShelfDataProvider for extension access)

/// Lightweight model for Top Shelf data exchange via App Groups.
/// Mirrors the struct in BayitPlusTVApp/Services/TopShelfDataProvider.swift.
private struct TopShelfCachedItem: Codable {
    let id: String
    let title: String
    let imageURL: String?
}

/// Shared constants for Top Shelf App Group storage.
/// Mirrors the enum in BayitPlusTVApp/Services/TopShelfDataProvider.swift.
private enum TopShelfConstants {
    static let appGroupID = "group.tv.bayit.plus"
    static let continueWatchingKey = "topshelf.continueWatching"
    static let trendingKey = "topshelf.trending"
}
#endif
