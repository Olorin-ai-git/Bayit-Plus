import BayitNetworking
import Foundation

/// Location provider for tvOS. Apple TV does not support GPS location,
/// so this returns nil. The backend falls back to IP-based geolocation.
struct TVLocationProvider: LocationProvider, Sendable {
    func currentLocation() async -> UserLocation? {
        nil
    }
}
