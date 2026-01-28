/**
 * SceneSearchIntentHandler - Siri TV Search Integration
 *
 * Handles Siri TV search requests like:
 * - "Play channel Galatz on Bayit+"
 * - "Watch Breaking Bad on Bayit+"
 * - "Open Bayit+ and play news"
 *
 * Parses INPlayMediaIntent, resolves content, and routes to deep links.
 *
 * Enhanced from stubbed implementation
 */

import Intents
import Foundation

class SceneSearchIntentHandler: INExtension, INPlayMediaIntentHandling {

    // MARK: - Configuration

    private let apiBaseURL = "https://api.bayit.tv/api/v1"

    // MARK: - INPlayMediaIntentHandling

    func handle(intent: INPlayMediaIntent, completion: @escaping (INPlayMediaIntentResponse) -> Void) {
        // Extract search query from intent
        guard let mediaSearch = intent.mediaSearch else {
            completion(INPlayMediaIntentResponse(code: .failure, userActivity: nil))
            return
        }

        // Parse search terms
        let searchTerm = mediaSearch.mediaName ?? ""
        let mediaType = parseMediaType(from: mediaSearch)

        // Resolve content from search term
        resolveContent(searchTerm: searchTerm, mediaType: mediaType) { [weak self] result in
            guard let self = self else {
                completion(INPlayMediaIntentResponse(code: .failure, userActivity: nil))
                return
            }

            switch result {
            case .success(let contentItem):
                // Build deep link
                let deepLink = self.buildDeepLink(for: contentItem)

                // Create user activity with deep link
                let userActivity = NSUserActivity(activityType: NSUserActivityTypeBrowsingWeb)
                userActivity.webpageURL = deepLink

                // Return success response
                let response = INPlayMediaIntentResponse(code: .handleInApp, userActivity: userActivity)
                completion(response)

            case .failure:
                // Return failure response
                completion(INPlayMediaIntentResponse(code: .failure, userActivity: nil))
            }
        }
    }

    func resolveMediaItems(for intent: INPlayMediaIntent, with completion: @escaping ([INPlayMediaMediaItemResolutionResult]) -> Void) {
        // Optional: Resolve media items for disambiguation
        // For now, we handle resolution in the handle() method
        completion([])
    }

    // MARK: - Content Resolution

    private func resolveContent(searchTerm: String, mediaType: String, completion: @escaping (Result<ContentItem, Error>) -> Void) {
        let urlString = "\(apiBaseURL)/search/siri"

        guard let url = URL(string: urlString) else {
            completion(.failure(NSError(domain: "SceneSearch", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 5.0

        let requestBody: [String: Any] = [
            "query": searchTerm,
            "type": mediaType
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        } catch {
            completion(.failure(error))
            return
        }

        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil else {
                completion(.failure(error ?? NSError(domain: "SceneSearch", code: 2, userInfo: [NSLocalizedDescriptionKey: "Network error"])))
                return
            }

            do {
                let decoder = JSONDecoder()
                decoder.keyDecodingStrategy = .convertFromSnakeCase
                let apiResponse = try decoder.decode(SiriSearchAPIResponse.self, from: data)

                if let firstResult = apiResponse.results.first {
                    completion(.success(firstResult))
                } else {
                    completion(.failure(NSError(domain: "SceneSearch", code: 3, userInfo: [NSLocalizedDescriptionKey: "No results found"])))
                }
            } catch {
                completion(.failure(error))
            }
        }

        task.resume()
    }

    // MARK: - Deep Link Building

    private func buildDeepLink(for contentItem: ContentItem) -> URL {
        let scheme = "bayit"
        let path: String

        switch contentItem.type {
        case "channel":
            path = "player?channelId=\(contentItem.id)"
        case "vod", "movie", "series":
            path = "player?vodId=\(contentItem.id)"
        case "podcast":
            path = "podcasts/\(contentItem.id)"
        case "radio":
            path = "radio/\(contentItem.id)"
        default:
            path = "home"
        }

        return URL(string: "\(scheme)://\(path)")!
    }

    // MARK: - Helper Methods

    private func parseMediaType(from mediaSearch: INMediaSearch) -> String {
        // Map INMediaItemType to our content types
        let mediaType = mediaSearch.mediaType
        switch mediaType {
        case .tvShow, .tvShowEpisode:
            return "series"
        case .movie:
            return "movie"
        case .music, .musicVideo, .radioStation:
            return "radio"
        default:
            return "all"
        }
    }
}

// MARK: - Data Models

struct SiriSearchAPIResponse: Codable {
    let results: [ContentItem]
    let query: String
}

struct ContentItem: Codable {
    let id: String
    let title: String
    let type: String // "channel", "vod", "movie", "series", "podcast", "radio"
    let imageUrl: String?
    let subtitle: String?
}
