import BayitCore
import BayitNetworking
import CoreLocation
import Foundation
import Observation

/// Location provider using CLLocationManager for city-level reverse geocoding.
///
/// Requests `whenInUseAuthorization` only. If the user denies permission,
/// city and state remain `nil` and location-based content is skipped.
@Observable
final class AppLocationProvider: NSObject, LocationProvider, CLLocationManagerDelegate,
    @unchecked Sendable
{
    private(set) var city: String?
    private(set) var state: String?
    private(set) var isResolved = false

    private let manager = CLLocationManager()
    private let geocoder = CLGeocoder()
    private let logger = BayitLogger(category: "Location")
    private var hasRequestedOnce = false

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    /// Request location permission and begin a single location lookup.
    func requestLocationIfNeeded() {
        guard !hasRequestedOnce else { return }
        hasRequestedOnce = true

        let status = manager.authorizationStatus
        switch status {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        case .denied, .restricted:
            logger.info("Location permission denied or restricted")
            isResolved = true
        @unknown default:
            isResolved = true
        }
    }

    // MARK: - LocationProvider conformance

    func currentLocation() async -> UserLocation? {
        guard let city else { return nil }
        return UserLocation(city: city, state: state)
    }

    // MARK: - CLLocationManagerDelegate

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        case .denied, .restricted:
            logger.info("Location authorization changed to denied/restricted")
            city = nil
            state = nil
            isResolved = true
        case .notDetermined:
            break
        @unknown default:
            isResolved = true
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        reverseGeocode(location)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        logger.warning("Location request failed", context: ["error": error.localizedDescription])
        isResolved = true
    }

    // MARK: - Reverse Geocoding

    private func reverseGeocode(_ location: CLLocation) {
        geocoder.reverseGeocodeLocation(location) { [weak self] placemarks, error in
            guard let self else { return }
            if let error {
                self.logger.warning(
                    "Reverse geocode failed",
                    context: ["error": error.localizedDescription]
                )
                self.isResolved = true
                return
            }
            let placemark = placemarks?.first
            self.city = placemark?.locality
            self.state = placemark?.administrativeArea
            self.isResolved = true

            self.logger.info(
                "Location resolved",
                context: [
                    "city": self.city ?? "unknown",
                    "state": self.state ?? "unknown",
                ]
            )
        }
    }
}
