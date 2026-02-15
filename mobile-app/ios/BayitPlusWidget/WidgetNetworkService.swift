//
//  WidgetNetworkService.swift
//  Network service for fetching Continue Watching data
//

import Foundation

struct WidgetNetworkService {
    static let baseURL = "https://api.bayit.tv/v1"

    static func fetchContinueWatching() async -> [WatchingContent]? {
        guard let authToken = getAuthToken() else {
            print("Widget: No auth token available")
            return nil
        }

        guard let url = URL(string: "\(baseURL)/user/continue-watching") else {
            print("Widget: Invalid URL")
            return nil
        }

        var request = URLRequest(url: url)
        request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpMethod = "GET"
        request.timeoutInterval = 10

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                print("Widget: Invalid response")
                return nil
            }

            guard httpResponse.statusCode == 200 else {
                print("Widget: HTTP error \(httpResponse.statusCode)")
                return nil
            }

            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            let apiResponse = try decoder.decode(ContinueWatchingResponse.self, from: data)

            print("Widget: Fetched \(apiResponse.items.count) continue watching items")
            return apiResponse.items.map { convertToWatchingContent($0) }

        } catch {
            print("Widget: Network error - \(error.localizedDescription)")
            return nil
        }
    }

    private static func getAuthToken() -> String? {
        // Try to get token from App Group shared defaults
        if let sharedDefaults = UserDefaults(suiteName: "group.tv.bayit.app") {
            if let token = sharedDefaults.string(forKey: "auth_token") {
                return token
            }
        }

        // Fallback: Try to get from keychain (for more secure storage)
        // This would require KeychainAccess framework
        return nil
    }

    private static func convertToWatchingContent(_ item: ContinueWatchingItem) -> WatchingContent {
        return WatchingContent(
            id: item.id,
            title: item.title,
            type: item.type,
            coverUrl: item.coverUrl,
            progress: Double(item.position) / Double(max(item.duration, 1)),
            duration: item.duration,
            position: item.position
        )
    }
}

// API Response Models
struct ContinueWatchingResponse: Codable {
    let items: [ContinueWatchingItem]
}

struct ContinueWatchingItem: Codable {
    let id: String
    let title: String
    let type: String
    let coverUrl: String?
    let duration: Int
    let position: Int
}
