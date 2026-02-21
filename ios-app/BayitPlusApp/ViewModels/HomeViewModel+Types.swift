import Foundation

// MARK: - Supporting Types

/// Culture city with its featured content for dynamic city rows.
struct CultureCityWithContent: Sendable, Identifiable {
    let city: CultureCity
    let content: CultureContentResponse

    var id: String {
        city.id
    }
}
