import BayitCore
import BayitNetworking
import Foundation

/// Location provider for tvOS using IP-based geolocation.
///
/// Apple TV has no GPS, so this provider resolves the user's city and state
/// from an IP geolocation service configured via `IP_GEOLOCATION_URL` in Info.plist.
/// The result is cached for the session lifetime.
struct TVLocationProvider: LocationProvider, Sendable {

    private static let logger = BayitLogger(category: "TVLocation")

    /// Session-scoped cache to avoid repeated network calls.
    private static let cache = IPLocationCache()

    func currentLocation() async -> UserLocation? {
        if let cached = await Self.cache.location {
            return cached
        }

        guard let urlString = Bundle.main.object(forInfoDictionaryKey: "IP_GEOLOCATION_URL") as? String,
              let url = URL(string: urlString) else {
            Self.logger.warning("IP_GEOLOCATION_URL not configured in Info.plist")
            return nil
        }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)

            guard let httpResponse = response as? HTTPURLResponse,
                  (200 ... 299).contains(httpResponse.statusCode) else {
                Self.logger.warning("IP geolocation request failed with non-2xx status")
                return nil
            }

            let geo = try JSONDecoder().decode(IPGeoResponse.self, from: data)
            let location = UserLocation(city: geo.city, state: geo.region)

            Self.logger.info(
                "IP geolocation resolved",
                context: [
                    "city": geo.city ?? "unknown",
                    "state": geo.region ?? "unknown",
                ]
            )

            await Self.cache.store(location)
            return location
        } catch {
            Self.logger.warning(
                "IP geolocation lookup failed",
                context: ["error": error.localizedDescription]
            )
            return nil
        }
    }
}

// MARK: - Response Model

/// Minimal JSON model for ipapi.co response fields.
private struct IPGeoResponse: Decodable {
    let city: String?
    let region: String?
}

// MARK: - Session Cache

/// Actor-based cache holding the resolved location for the app session.
private actor IPLocationCache {
    var location: UserLocation?

    func store(_ loc: UserLocation) {
        location = loc
    }
}
