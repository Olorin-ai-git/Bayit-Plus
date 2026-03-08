import Foundation

/// Protocol for providing the user's location string.
///
/// The networking layer attaches `X-User-Location` (and optionally
/// `X-User-City` / `X-User-State`) headers for geo-based content.
/// The host app supplies location from CoreLocation, cached storage,
/// or IP geolocation -- the networking package is agnostic.
public protocol LocationProvider: Sendable {
    /// Returns a location descriptor for the current user, or `nil`
    /// if location is unavailable or not consented.
    func currentLocation() async -> UserLocation?
}

/// Lightweight value type describing the user's location for API headers.
///
/// The ``state`` property is always normalised to a two-letter US state
/// abbreviation when the input is a recognised full state name (e.g.
/// "New Jersey" → "NJ"). This keeps API calls consistent regardless of
/// whether the value originates from CoreLocation, IP geolocation, or
/// a backend reverse-geocode response.
public struct UserLocation: Sendable, Equatable {
    public let city: String?
    public let state: String?

    public init(city: String?, state: String?) {
        self.city = city
        self.state = Self.normalizeState(state)
    }

    /// Returns a two-letter abbreviation if ``raw`` is a known US state
    /// name; otherwise returns the original value unchanged.
    private static func normalizeState(_ raw: String?) -> String? {
        guard let raw, !raw.isEmpty else { return raw }
        // Already a two-letter code
        if raw.count == 2 { return raw.uppercased() }
        return usStateAbbreviations[raw.lowercased()] ?? raw
    }

    // swiftlint:disable:next identifier_name
    private static let usStateAbbreviations: [String: String] = [
        "alabama": "AL", "alaska": "AK", "arizona": "AZ",
        "arkansas": "AR", "california": "CA", "colorado": "CO",
        "connecticut": "CT", "delaware": "DE", "florida": "FL",
        "georgia": "GA", "hawaii": "HI", "idaho": "ID",
        "illinois": "IL", "indiana": "IN", "iowa": "IA",
        "kansas": "KS", "kentucky": "KY", "louisiana": "LA",
        "maine": "ME", "maryland": "MD", "massachusetts": "MA",
        "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
        "missouri": "MO", "montana": "MT", "nebraska": "NE",
        "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
        "new mexico": "NM", "new york": "NY", "north carolina": "NC",
        "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
        "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI",
        "south carolina": "SC", "south dakota": "SD", "tennessee": "TN",
        "texas": "TX", "utah": "UT", "vermont": "VT",
        "virginia": "VA", "washington": "WA", "west virginia": "WV",
        "wisconsin": "WI", "wyoming": "WY",
        "district of columbia": "DC",
    ]
}
