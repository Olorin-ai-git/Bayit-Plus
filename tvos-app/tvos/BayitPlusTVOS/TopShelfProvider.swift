/**
 * TopShelfProvider - tvOS Top Shelf Content Provider
 *
 * Displays trending content from Bayit+ on the Apple TV Home Screen Top Shelf.
 * Fetches 5-7 top items (movies, live channels, podcasts) from backend API.
 * Updates every 12 hours with proper caching and error handling.
 *
 * Enhanced from stubbed implementation
 */

import TVServices
import Foundation

class TopShelfProvider: TVTopShelfContentProvider {

    // MARK: - Configuration

    private let apiBaseURL = "https://api.bayit.tv/api/v1"
    private let cacheKey = "TopShelfLastUpdate"
    private let cacheDuration: TimeInterval = 12 * 60 * 60 // 12 hours
    private let maxItems = 7

    // MARK: - Top Shelf Content Loading

    override func loadTopShelfContent(completionHandler: @escaping (TVTopShelfContent?) -> Void) {
        // Check if cache is still valid
        if shouldUseCachedContent() {
            loadCachedContent(completionHandler: completionHandler)
            return
        }

        // Fetch fresh content from API
        fetchTrendingContent { [weak self] items in
            guard let self = self, !items.isEmpty else {
                // Fallback to cached content on error
                self?.loadCachedContent(completionHandler: completionHandler)
                return
            }

            // Cache the items
            self.cacheTopShelfItems(items)

            // Convert to TVTopShelfContent
            let content = self.createTopShelfContent(from: items)
            completionHandler(content)
        }
    }

    // MARK: - API Fetching

    private func fetchTrendingContent(completion: @escaping ([TopShelfItem]) -> Void) {
        let urlString = "\(apiBaseURL)/trending/topshelf?limit=\(maxItems)"

        guard let url = URL(string: urlString) else {
            completion([])
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 10.0

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                completion([])
                return
            }

            do {
                let decoder = JSONDecoder()
                decoder.keyDecodingStrategy = .convertFromSnakeCase
                let apiResponse = try decoder.decode(TopShelfAPIResponse.self, from: data)
                completion(apiResponse.items)
            } catch {
                completion([])
            }
        }

        task.resume()
    }

    // MARK: - Content Creation

    private func createTopShelfContent(from items: [TopShelfItem]) -> TVTopShelfContent {
        let sectionItems = items.map { item -> TVTopShelfSectionedItem in
            let tvItem = TVTopShelfSectionedItem(identifier: item.id)
            tvItem.title = item.title
            tvItem.imageShape = .hdtv // 16:9 aspect ratio for content

            // Set image URL with fallback
            if let imageURL = URL(string: item.imageUrl) {
                tvItem.setImageURL(imageURL, for: .screenScale1x)
                if let image2xURL = URL(string: item.imageUrl.replacingOccurrences(of: ".jpg", with: "@2x.jpg")) {
                    tvItem.setImageURL(image2xURL, for: .screenScale2x)
                }
            }

            // Set subtitle/summary
            if let subtitle = item.subtitle {
                tvItem.summary = subtitle
            }

            // Set play action with deep link
            let deepLinkURL = createDeepLink(for: item)
            tvItem.playAction = TVTopShelfAction(url: deepLinkURL)

            return tvItem
        }

        // Create section
        let section = TVTopShelfItemCollection(items: sectionItems)
        section.title = "Trending on Bayit+"

        // Create content
        let content = TVTopShelfSectionedContent(sections: [section])
        return content
    }

    private func createDeepLink(for item: TopShelfItem) -> URL {
        let scheme = "bayit"
        let path: String

        switch item.type {
        case "movie", "series":
            path = "player?vodId=\(item.id)"
        case "channel":
            path = "player?channelId=\(item.id)"
        case "podcast":
            path = "podcasts/\(item.id)"
        case "radio":
            path = "radio/\(item.id)"
        default:
            path = "home"
        }

        return URL(string: "\(scheme)://\(path)")!
    }

    // MARK: - Caching

    private func shouldUseCachedContent() -> Bool {
        let lastUpdate = UserDefaults.standard.double(forKey: cacheKey)
        guard lastUpdate > 0 else { return false }

        let timeSinceUpdate = Date().timeIntervalSince1970 - lastUpdate
        return timeSinceUpdate < cacheDuration
    }

    private func cacheTopShelfItems(_ items: [TopShelfItem]) {
        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(items)
            UserDefaults.standard.set(data, forKey: "TopShelfCachedItems")
            UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: cacheKey)
        } catch {
            // Ignore cache errors
        }
    }

    private func loadCachedContent(completionHandler: @escaping (TVTopShelfContent?) -> Void) {
        guard let data = UserDefaults.standard.data(forKey: "TopShelfCachedItems") else {
            completionHandler(nil)
            return
        }

        do {
            let decoder = JSONDecoder()
            let items = try decoder.decode([TopShelfItem].self, from: data)

            if items.isEmpty {
                completionHandler(nil)
            } else {
                let content = createTopShelfContent(from: items)
                completionHandler(content)
            }
        } catch {
            completionHandler(nil)
        }
    }
}

// MARK: - Data Models

struct TopShelfAPIResponse: Codable {
    let items: [TopShelfItem]
    let timestamp: String?
}

struct TopShelfItem: Codable {
    let id: String
    let title: String
    let type: String // "movie", "series", "channel", "podcast", "radio"
    let imageUrl: String
    let subtitle: String?
}
