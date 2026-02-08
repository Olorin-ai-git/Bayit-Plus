import Foundation

// MARK: - Zmanim / Shabbat

/// Response from GET /api/v1/zmanim with Shabbat times and parasha info.
struct ZmanTimeResponse: Decodable, Sendable {
    let isShabbat: Bool?
    let isErevShabbat: Bool?
    let candleLighting: String?
    let havdalah: String?
    let countdown: String?
    let countdownLabel: String?
    let parashaHebrew: String?
    let parashaEnglish: String?
}

/// Request body for updating zmanim preferences.
struct ZmanPreferences: Encodable, Sendable {
    let showIsraelTime: Bool?
    let shabbatModeEnabled: Bool?
    let localTimezone: String?
}

/// Shabbat status information for a location.
struct ShabbatStatus: Decodable, Sendable {
    let status: String?
    let candleLightingTime: String?
    let havdalahTime: String?
    let city: String?
    let state: String?
}
