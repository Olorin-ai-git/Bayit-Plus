import BayitLocalization
import BayitMedia
import Foundation

/// Section configuration for TVHomeView with fixed ordering and metadata.
enum TVHomeSection: Int, CaseIterable {
    case continueWatching = 0
    case nearMe
    case whatsHot
    case jerusalem
    case telAviv
    case liveTV
    case israeliMovies
    case movies
    case kids
    case youngsters
    case music
    case documentary
    case israeliSeries
    case series
    case podcasts
    case audiobooks

    var titleKey: String {
        switch self {
        case .continueWatching: return "home.continueWatching"
        case .nearMe: return "home.nearMe"
        case .whatsHot: return "home.whatsHot"
        case .jerusalem: return "home.jerusalemConnection"
        case .telAviv: return "home.telAvivConnection"
        case .liveTV: return "home.liveTV"
        case .israeliMovies: return "home.israeliMovies"
        case .movies: return "home.movies"
        case .kids: return "nav.children"
        case .youngsters: return "nav.youngsters"
        case .music: return "home.music"
        case .documentary: return "home.documentary"
        case .israeliSeries: return "home.israeliSeries"
        case .series: return "home.series"
        case .podcasts: return "nav.podcasts"
        case .audiobooks: return "nav.audiobooks"
        }
    }

    func localizedTitle(_ localization: LocalizationManager) -> String {
        localization.t(titleKey)
    }

    var icon: String {
        switch self {
        case .continueWatching: return "play.circle.fill"
        case .nearMe: return "location.fill"
        case .whatsHot: return "flame.fill"
        case .jerusalem: return "building.columns.fill"
        case .telAviv: return "building.2.fill"
        case .liveTV: return "dot.radiowaves.left.and.right"
        case .israeliMovies: return "film.fill"
        case .movies: return "film"
        case .kids: return "figure.and.child.holdinghands"
        case .youngsters: return "figure.2"
        case .music: return "music.note"
        case .documentary: return "doc.text.image"
        case .israeliSeries: return "tv.fill"
        case .series: return "tv"
        case .podcasts: return "mic.fill"
        case .audiobooks: return "headphones"
        }
    }

    /// Sections that depend on the owner's private content library.
    /// In public (non-owner) mode, these are hidden.
    var requiresOwnerMode: Bool {
        switch self {
        case .continueWatching, .nearMe, .whatsHot, .jerusalem, .telAviv, .liveTV:
            return false
        case .israeliMovies, .movies, .kids, .youngsters, .music,
             .documentary, .israeliSeries, .series:
            return true
        case .podcasts, .audiobooks:
            return false
        }
    }

    var aspectRatio: CGFloat {
        switch self {
        case .podcasts, .audiobooks, .liveTV:
            return 1.0
        default:
            return 2.0 / 3.0
        }
    }

    /// Returns true if the user expressed interest in this section type.
    /// Sections without a direct interest mapping (continueWatching, nearMe, etc.)
    /// are always visible.
    @MainActor
    func isVisible(given prefs: TVOnboardingPreferences) -> Bool {
        guard prefs.isOnboarded else { return true }
        switch self {
        case .continueWatching, .nearMe, .whatsHot, .jerusalem, .telAviv:
            return true
        case .liveTV:
            return prefs.showLiveTV
        case .israeliMovies, .movies:
            return prefs.showMovies
        case .kids, .youngsters:
            return prefs.showKids
        case .music:
            return prefs.showMusic
        case .documentary:
            return prefs.showMovies || prefs.showNews
        case .israeliSeries, .series:
            return prefs.showSeries
        case .podcasts:
            return prefs.showPodcasts
        case .audiobooks:
            return prefs.showAudiobooks
        }
    }

    /// Returns true if this section has data in the view model
    @MainActor
    func hasData(in viewModel: HomeViewModel) -> Bool {
        switch self {
        case .continueWatching:
            return !viewModel.continueWatching.isEmpty
        case .nearMe:
            return hasNearMeData(viewModel)
        case .whatsHot:
            return !viewModel.trendingContent.isEmpty
        case .jerusalem:
            return viewModel.jerusalemContent?.items.isEmpty == false
        case .telAviv:
            return viewModel.telAvivContent?.items.isEmpty == false
        case .liveTV:
            return !viewModel.liveChannels.isEmpty
        case .israeliMovies:
            return hasCategory(viewModel, matching: { name in
                (name.contains("israeli") || name.contains("israel")) &&
                    (name.contains("movie") || name.contains("film"))
            })
        case .movies:
            return hasCategory(viewModel, matching: { name in
                (name.contains("movie") || name.contains("film")) &&
                    !name.contains("israeli") && !name.contains("israel")
            })
        case .kids:
            return hasCategory(viewModel, matching: { $0.contains("kid") || $0.contains("children") })
        case .youngsters:
            return hasCategory(viewModel, matching: { $0.contains("youngster") })
        case .music:
            return hasCategory(viewModel, matching: { $0.contains("music") })
        case .documentary:
            return hasCategory(viewModel, matching: { $0.contains("document") })
        case .israeliSeries:
            return hasCategory(viewModel, matching: { $0.contains("israeli") && $0.contains("series") })
        case .series:
            return hasCategory(viewModel, matching: { $0.contains("series") && !$0.contains("israeli") })
        case .podcasts:
            return hasCategory(viewModel, matching: { $0.contains("podcast") })
        case .audiobooks:
            return hasCategory(viewModel, matching: { $0.contains("audiobook") })
        }
    }

    @MainActor
    private func hasNearMeData(_ viewModel: HomeViewModel) -> Bool {
        if let israelis = viewModel.israelisInCity?.content,
           let articles = israelis.newsArticles, !articles.isEmpty
        {
            return true
        }
        if let businesses = viewModel.israeliBusinesses?.content,
           let businessArticles = businesses.newsArticles, !businessArticles.isEmpty
        {
            return true
        }
        return false
    }

    @MainActor
    private func hasCategory(_ viewModel: HomeViewModel, matching: (String) -> Bool) -> Bool {
        return viewModel.categories.contains { category in
            matching(category.name.lowercased()) && !category.items.isEmpty
        }
    }

    /// Returns the category from the view model that matches this section
    @MainActor
    func category(from viewModel: HomeViewModel) -> ContentCategory? {
        switch self {
        case .israeliMovies:
            return viewModel.categories.first { category in
                let lower = category.name.lowercased()
                return (lower.contains("israeli") || lower.contains("israel")) &&
                    (lower.contains("movie") || lower.contains("film"))
            }
        case .movies:
            return viewModel.categories.first { category in
                let lower = category.name.lowercased()
                return (lower.contains("movie") || lower.contains("film")) &&
                    !lower.contains("israeli") && !lower.contains("israel")
            }
        case .kids:
            return viewModel.categories.first { $0.name.lowercased().contains("kid") || $0.name.lowercased().contains("children") }
        case .youngsters:
            return viewModel.categories.first { $0.name.lowercased().contains("youngster") }
        case .music:
            return viewModel.categories.first { $0.name.lowercased().contains("music") }
        case .documentary:
            return viewModel.categories.first { $0.name.lowercased().contains("document") }
        case .israeliSeries:
            return viewModel.categories.first { $0.name.lowercased().contains("israeli") && $0.name.lowercased().contains("series") }
        case .series:
            return viewModel.categories.first { $0.name.lowercased().contains("series") && !$0.name.lowercased().contains("israeli") }
        case .podcasts:
            return viewModel.categories.first { $0.name.lowercased().contains("podcast") }
        case .audiobooks:
            return viewModel.categories.first { $0.name.lowercased().contains("audiobook") }
        default:
            return nil
        }
    }
}
