import Foundation

/// Content interests for tvOS onboarding personalization.
/// Maps to Bayit+ content categories for recommendation tuning.
enum TVContentInterest: String, CaseIterable, Identifiable, Hashable, Sendable {
    case liveTV = "live_tv"
    case movies
    case series
    case kids
    case music
    case radio
    case podcasts
    case audiobooks
    case news
    case sports

    var id: String {
        rawValue
    }

    var iconName: String {
        switch self {
        case .liveTV: return "tv"
        case .movies: return "film"
        case .series: return "play.rectangle.on.rectangle"
        case .kids: return "figure.and.child.holdinghands"
        case .music: return "music.note"
        case .radio: return "radio"
        case .podcasts: return "mic"
        case .audiobooks: return "headphones"
        case .news: return "newspaper"
        case .sports: return "sportscourt"
        }
    }

    var localizationKey: String {
        "onboarding.interests.\(rawValue)"
    }
}
