import Foundation

/// Audio track metadata for player track selection (shared across iOS/tvOS).
struct AudioTrack: Identifiable, Hashable {
    let id: String
    let label: String
    let language: String?
}
