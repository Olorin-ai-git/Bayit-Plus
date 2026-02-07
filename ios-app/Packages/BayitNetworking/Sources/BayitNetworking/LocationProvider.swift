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
public struct UserLocation: Sendable, Equatable {
    public let city: String?
    public let state: String?

    public init(city: String?, state: String?) {
        self.city = city
        self.state = state
    }
}
