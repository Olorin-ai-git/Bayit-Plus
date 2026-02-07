import BayitNetworking
import Foundation

/// Location provider that returns cached user location for API headers.
///
/// Phase 1 provides a no-op implementation. In Phase 4, this will be
/// wired to CoreLocation for real geo-based content filtering.
struct AppLocationProvider: LocationProvider {

    func currentLocation() async -> UserLocation? {
        nil
    }
}
