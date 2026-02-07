import CoreSpotlight
import Foundation
import UniformTypeIdentifiers

/// Indexes Bayit+ content for iOS Spotlight search.
/// When users search from the home screen, matching Bayit+ content
/// appears in results and taps open the app via deep link.
@MainActor
final class SpotlightIndexer {
    private let domainIdentifier = "tv.bayit.plus"

    // MARK: - Index Content

    /// Index a batch of movies for Spotlight search.
    func indexMovies(_ movies: [SpotlightItem]) {
        let items = movies.map { movie in
            makeSearchableItem(
                id: "movie-\(movie.id)",
                title: movie.title ?? movie.id,
                description: movie.description,
                thumbnailString: movie.thumbnail,
                contentType: "movie",
                keywords: [movie.category].compactMap { $0 }
            )
        }
        index(items)
    }

    /// Index a batch of series for Spotlight search.
    func indexSeries(_ series: [SpotlightItem]) {
        let items = series.map { item in
            makeSearchableItem(
                id: "series-\(item.id)",
                title: item.title ?? item.id,
                description: item.description,
                thumbnailString: item.thumbnail,
                contentType: "series",
                keywords: [item.category].compactMap { $0 }
            )
        }
        index(items)
    }

    /// Index live TV channels for Spotlight search.
    func indexChannels(_ channels: [SpotlightItem]) {
        let items = channels.map { channel in
            makeSearchableItem(
                id: "channel-\(channel.id)",
                title: channel.title ?? channel.id,
                description: channel.description,
                thumbnailString: channel.thumbnail,
                contentType: "live",
                keywords: [channel.category].compactMap { $0 }
            )
        }
        index(items)
    }

    /// Index radio stations for Spotlight search.
    func indexRadioStations(_ stations: [SpotlightItem]) {
        let items = stations.map { station in
            makeSearchableItem(
                id: "radio-\(station.id)",
                title: station.title ?? station.id,
                description: station.description,
                thumbnailString: station.thumbnail,
                contentType: "radio",
                keywords: [station.category].compactMap { $0 }
            )
        }
        index(items)
    }

    // MARK: - Remove Content

    /// Remove all Bayit+ items from the Spotlight index.
    func removeAll() {
        CSSearchableIndex.default().deleteSearchableItems(
            withDomainIdentifiers: [domainIdentifier]
        )
    }

    /// Remove specific items from the index by content IDs.
    func remove(ids: [String]) {
        CSSearchableIndex.default().deleteSearchableItems(
            withIdentifiers: ids
        )
    }

    // MARK: - Private

    private func makeSearchableItem(
        id: String,
        title: String,
        description: String?,
        thumbnailString: String?,
        contentType: String,
        keywords: [String]
    ) -> CSSearchableItem {
        let attributes = CSSearchableItemAttributeSet(
            contentType: UTType.audiovisualContent
        )
        attributes.title = title
        attributes.contentDescription = description
        attributes.keywords = keywords

        if let urlString = thumbnailString {
            attributes.thumbnailURL = URL(string: urlString)
        }

        // Deep link: bayitplus://play/{id}?type={contentType}
        attributes.relatedUniqueIdentifier = id
        attributes.url = URL(
            string: "bayitplus://play/\(id)?type=\(contentType)"
        )

        return CSSearchableItem(
            uniqueIdentifier: id,
            domainIdentifier: domainIdentifier,
            attributeSet: attributes
        )
    }

    private func index(_ items: [CSSearchableItem]) {
        guard !items.isEmpty else { return }
        CSSearchableIndex.default().indexSearchableItems(items)
    }
}
