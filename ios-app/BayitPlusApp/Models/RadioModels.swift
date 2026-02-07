import Foundation

// MARK: - Radio

/// Response from GET /api/v1/radio/stations
struct StationsResponse: Decodable, Sendable {
    let stations: [RadioStationItem]
    let total: Int
}

/// A radio station
struct RadioStationItem: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let description: String?
    let logo: String?
    let genre: String?
    let cultureId: String?
    let currentShow: String?
    let currentSong: String?
}

/// Response from GET /api/v1/radio/{station_id}
struct RadioStationDetail: Decodable, Sendable, Identifiable {
    let id: String
    let name: String?
    let description: String?
    let logo: String?
    let genre: String?
    let currentShow: String?
    let currentSong: String?
}

/// Response from GET /api/v1/radio/{station_id}/stream
struct RadioStreamResponse: Decodable, Sendable {
    let url: String
    let type: String
}
