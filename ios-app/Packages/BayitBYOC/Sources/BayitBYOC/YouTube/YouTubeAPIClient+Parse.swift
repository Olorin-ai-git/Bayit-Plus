import Foundation

extension YouTubeAPIClient {
    func parseSubscriptions(_ data: Data) throws -> YouTubePageResponse<YouTubeSubscription> {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let items = json["items"] as? [[String: Any]]
        else { throw YouTubeError.invalidResponse }

        let subs = items.compactMap { item -> YouTubeSubscription? in
            guard let snippet = item["snippet"] as? [String: Any],
                  let resourceId = snippet["resourceId"] as? [String: Any],
                  let channelId = resourceId["channelId"] as? String,
                  let title = snippet["title"] as? String
            else { return nil }

            let thumb = thumbnailURL(from: snippet)
            return YouTubeSubscription(
                channelId: channelId, title: title,
                description: snippet["description"] as? String, thumbnailURL: thumb
            )
        }

        return YouTubePageResponse(
            items: subs,
            nextPageToken: json["nextPageToken"] as? String,
            totalResults: pageTotal(from: json)
        )
    }

    func parseSearchResults(_ data: Data) throws -> YouTubePageResponse<YouTubeVideo> {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let items = json["items"] as? [[String: Any]]
        else { throw YouTubeError.invalidResponse }

        let videos = items.compactMap { item -> YouTubeVideo? in
            guard let id = item["id"] as? [String: Any],
                  let videoId = id["videoId"] as? String,
                  let snippet = item["snippet"] as? [String: Any],
                  let title = snippet["title"] as? String
            else { return nil }

            return YouTubeVideo(
                id: videoId, title: title,
                description: snippet["description"] as? String,
                thumbnailURL: thumbnailURL(from: snippet),
                channelTitle: snippet["channelTitle"] as? String,
                publishedAt: parseDate(snippet["publishedAt"] as? String),
                duration: nil,
                liveBroadcastContent: snippet["liveBroadcastContent"] as? String
            )
        }

        return YouTubePageResponse(
            items: videos,
            nextPageToken: json["nextPageToken"] as? String,
            totalResults: pageTotal(from: json)
        )
    }

    func parsePlaylistItems(_ data: Data) throws -> YouTubePageResponse<YouTubeVideo> {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let items = json["items"] as? [[String: Any]]
        else { throw YouTubeError.invalidResponse }

        let videos = items.compactMap { item -> YouTubeVideo? in
            guard let snippet = item["snippet"] as? [String: Any],
                  let resourceId = snippet["resourceId"] as? [String: Any],
                  let videoId = resourceId["videoId"] as? String,
                  let title = snippet["title"] as? String
            else { return nil }

            return YouTubeVideo(
                id: videoId, title: title,
                description: snippet["description"] as? String,
                thumbnailURL: thumbnailURL(from: snippet),
                channelTitle: snippet["channelTitle"] as? String,
                publishedAt: parseDate(snippet["publishedAt"] as? String),
                duration: nil, liveBroadcastContent: nil
            )
        }

        return YouTubePageResponse(
            items: videos,
            nextPageToken: json["nextPageToken"] as? String,
            totalResults: pageTotal(from: json)
        )
    }

    func parsePlaylists(_ data: Data) throws -> YouTubePageResponse<YouTubePlaylist> {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let items = json["items"] as? [[String: Any]]
        else { throw YouTubeError.invalidResponse }

        let playlists = items.compactMap { item -> YouTubePlaylist? in
            guard let id = item["id"] as? String,
                  let snippet = item["snippet"] as? [String: Any],
                  let title = snippet["title"] as? String
            else { return nil }

            let details = item["contentDetails"] as? [String: Any]
            let count = details?["itemCount"] as? Int ?? 0

            return YouTubePlaylist(
                id: id, title: title,
                description: snippet["description"] as? String,
                thumbnailURL: thumbnailURL(from: snippet), itemCount: count
            )
        }

        return YouTubePageResponse(
            items: playlists,
            nextPageToken: json["nextPageToken"] as? String,
            totalResults: pageTotal(from: json)
        )
    }

    // MARK: - Helpers

    func thumbnailURL(from snippet: [String: Any]) -> URL? {
        guard let thumbs = snippet["thumbnails"] as? [String: Any] else { return nil }
        let preferred = thumbs["high"] as? [String: Any]
            ?? thumbs["medium"] as? [String: Any]
            ?? thumbs["default"] as? [String: Any]
        guard let urlStr = preferred?["url"] as? String else { return nil }
        return URL(string: urlStr)
    }

    func pageTotal(from json: [String: Any]) -> Int {
        (json["pageInfo"] as? [String: Any])?["totalResults"] as? Int ?? 0
    }

    func parseDate(_ str: String?) -> Date? {
        guard let str else { return nil }
        let formatter = ISO8601DateFormatter()
        return formatter.date(from: str)
    }
}
