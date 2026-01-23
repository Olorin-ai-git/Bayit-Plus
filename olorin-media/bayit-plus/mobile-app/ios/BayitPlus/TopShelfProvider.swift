#if os(tvOS)
import TVServices

class TopShelfProvider: TVTopShelfContentProvider {

    override func loadTopShelfContent(completionHandler: @escaping (TVTopShelfContent?) -> Void) {
        fetchRecentPodcastEpisodes { episodes in
            guard !episodes.isEmpty else {
                completionHandler(nil)
                return
            }

            let sectionItems = episodes.map { episode -> TVTopShelfSectionedItem in
                let item = TVTopShelfSectionedItem(identifier: episode.id)
                item.title = episode.title
                item.imageShape = .square

                if let thumbnailURL = URL(string: episode.thumbnail ?? "") {
                    item.setImageURL(thumbnailURL, for: .screenScale1x)
                }

                if episode.availableLanguages.count > 1 {
                    let languages = episode.availableLanguages.map { $0.uppercased() }.joined(separator: ", ")
                    item.summary = "Available in: \(languages)"
                }

                if let episodeURL = URL(string: "bayitplus://podcast/\(episode.podcastId)/episode/\(episode.id)") {
                    item.playAction = TVTopShelfAction(url: episodeURL)
                }

                return item
            }

            let section = TVTopShelfItemCollection(items: sectionItems)
            section.title = "Recently Played Podcasts"

            let content = TVTopShelfSectionedContent(sections: [section])
            completionHandler(content)
        }
    }

    private func fetchRecentPodcastEpisodes(completion: @escaping ([TopShelfPodcastEpisode]) -> Void) {
        completion([])
    }
}

struct TopShelfPodcastEpisode {
    let id: String
    let podcastId: String
    let title: String
    let thumbnail: String?
    let availableLanguages: [String]
}
#endif
