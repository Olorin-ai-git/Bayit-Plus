import Foundation
import Observation

// MARK: - Sort Option

/// Sort options for the audiobooks grid
enum AudiobookSortOption: String, CaseIterable, Sendable {
    case featured
    case titleAZ
    case titleZA
    case authorAZ
    case newest
    case oldest
    case highestRated

    var label: String {
        switch self {
        case .featured: return "Featured"
        case .titleAZ: return "Title A-Z"
        case .titleZA: return "Title Z-A"
        case .authorAZ: return "Author A-Z"
        case .newest: return "Newest First"
        case .oldest: return "Oldest First"
        case .highestRated: return "Highest Rated"
        }
    }

    var iconName: String {
        switch self {
        case .featured: return "star"
        case .titleAZ: return "textformat.abc"
        case .titleZA: return "textformat.abc"
        case .authorAZ: return "person"
        case .newest: return "calendar.badge.clock"
        case .oldest: return "calendar"
        case .highestRated: return "hand.thumbsup"
        }
    }
}

// MARK: - ViewModel

/// ViewModel for the Audiobooks listing screen - manages full library with client-side search, filter, and sort
@MainActor
@Observable
final class AudiobooksViewModel {
    private(set) var items: [Audiobook] = []
    private(set) var isLoading = false
    private(set) var error: String?

    var searchQuery: String = ""
    var sortOption: AudiobookSortOption = .featured

    var selectedGenre: String?
    var selectedAuthor: String?

    private let repository: any AudiobookRepository
    private let pageSize = 500

    init(repository: any AudiobookRepository) {
        self.repository = repository
    }

    // MARK: - Computed Properties

    /// Items filtered by search query and sorted by the selected option
    var filteredItems: [Audiobook] {
        let base: [Audiobook]
        if searchQuery.trimmingCharacters(in: .whitespaces).count >= 2 {
            let query = searchQuery.lowercased()
            base = items.filter { audiobook in
                (audiobook.title?.lowercased().contains(query) ?? false)
                    || (audiobook.author?.lowercased().contains(query) ?? false)
                    || (audiobook.narrator?.lowercased().contains(query) ?? false)
            }
        } else {
            base = items
        }
        return applySorting(to: base)
    }

    /// Up to 5 unique title/author suggestions matching the current query (min 2 chars)
    var autocompleteSuggestions: [String] {
        let trimmed = searchQuery.trimmingCharacters(in: .whitespaces)
        guard trimmed.count >= 2 else { return [] }
        let query = trimmed.lowercased()
        var seen = Set<String>()
        var results: [String] = []
        for audiobook in items {
            if let title = audiobook.title,
               title.lowercased().contains(query),
               seen.insert(title).inserted
            {
                results.append(title)
            }
            if results.count >= 5 { break }
            if let author = audiobook.author,
               author.lowercased().contains(query),
               seen.insert(author).inserted
            {
                results.append(author)
            }
            if results.count >= 5 { break }
        }
        return results
    }

    // MARK: - Data Loading

    @MainActor
    func loadInitial() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchAll(
                page: 1,
                pageSize: pageSize,
                genre: selectedGenre,
                author: selectedAuthor
            )
            items = response.items ?? []
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func filterByGenre(_ genre: String?) async {
        selectedGenre = genre
        await loadInitial()
    }

    @MainActor
    func filterByAuthor(_ author: String?) async {
        selectedAuthor = author
        await loadInitial()
    }

    @MainActor
    func refresh() async {
        await loadInitial()
    }

    // MARK: - Private

    private func applySorting(to audiobooks: [Audiobook]) -> [Audiobook] {
        switch sortOption {
        case .featured:
            return audiobooks
        case .titleAZ:
            return audiobooks.sorted { ($0.title ?? "") < ($1.title ?? "") }
        case .titleZA:
            return audiobooks.sorted { ($0.title ?? "") > ($1.title ?? "") }
        case .authorAZ:
            return audiobooks.sorted { ($0.author ?? "") < ($1.author ?? "") }
        case .newest:
            return audiobooks.sorted { ($0.createdAt ?? "") > ($1.createdAt ?? "") }
        case .oldest:
            return audiobooks.sorted { ($0.createdAt ?? "") < ($1.createdAt ?? "") }
        case .highestRated:
            return audiobooks.sorted { ($0.avgRating ?? 0) > ($1.avgRating ?? 0) }
        }
    }
}
