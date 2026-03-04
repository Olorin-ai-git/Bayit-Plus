import Foundation
import Observation

// MARK: - Sort Option

/// Sort options for the audiobooks grid
enum AudiobookSortOption: String, CaseIterable, Sendable {
    case featured
    case titleAZ
    case titleZA
    case authorAZ
    case authorZA
    case newest
    case oldest
    case highestRated
    case mostBooks

    var label: String {
        switch self {
        case .featured: return "Featured"
        case .titleAZ: return "Title A-Z"
        case .titleZA: return "Title Z-A"
        case .authorAZ: return "Author A-Z"
        case .authorZA: return "Author Z-A"
        case .newest: return "Newest First"
        case .oldest: return "Oldest First"
        case .highestRated: return "Highest Rated"
        case .mostBooks: return "Most Books"
        }
    }

    var iconName: String {
        switch self {
        case .featured: return "star"
        case .titleAZ: return "textformat.abc"
        case .titleZA: return "textformat.abc"
        case .authorAZ: return "person"
        case .authorZA: return "person"
        case .newest: return "calendar.badge.clock"
        case .oldest: return "calendar"
        case .highestRated: return "hand.thumbsup"
        case .mostBooks: return "books.vertical"
        }
    }

    static let titleOptions: [AudiobookSortOption] = [
        .featured, .titleAZ, .titleZA, .authorAZ, .newest, .oldest, .highestRated,
    ]

    static let authorOptions: [AudiobookSortOption] = [
        .authorAZ, .authorZA, .mostBooks,
    ]
}

// MARK: - ViewModel

/// ViewModel for the Audiobooks listing screen - manages full library with client-side search, filter, and sort
@MainActor
@Observable
final class AudiobooksViewModel {
    private(set) var items: [Audiobook] = []
    private(set) var isLoading = false
    private(set) var isLoadingMore = false
    private(set) var error: String?

    var searchQuery: String = ""
    var sortOption: AudiobookSortOption = .featured

    var selectedGenre: String?
    var selectedAuthor: String?

    private let repository: any AudiobookRepository
    private let pageSize = 500
    private var currentPage = 1
    private var hasMorePages = true

    init(repository: any AudiobookRepository) {
        self.repository = repository
    }

    // MARK: - Computed Properties

    /// Items filtered by search query, author, genre and sorted
    var filteredItems: [Audiobook] {
        var base = items

        if let author = selectedAuthor {
            base = base.filter { $0.author?.caseInsensitiveCompare(author) == .orderedSame }
        }

        if searchQuery.trimmingCharacters(in: .whitespaces).count >= 2 {
            let query = searchQuery.lowercased()
            base = base.filter { audiobook in
                (audiobook.title?.lowercased().contains(query) ?? false)
                    || (audiobook.author?.lowercased().contains(query) ?? false)
                    || (audiobook.narrator?.lowercased().contains(query) ?? false)
            }
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
        currentPage = 1
        hasMorePages = true

        do {
            let response = try await repository.fetchAll(
                page: 1,
                pageSize: pageSize,
                genre: selectedGenre,
                author: selectedAuthor
            )
            items = response.items ?? []
            hasMorePages = (response.page ?? 1) < (response.totalPages ?? 1)
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func loadMore() async {
        guard !isLoading, !isLoadingMore, hasMorePages else { return }
        isLoadingMore = true

        let nextPage = currentPage + 1
        do {
            let response = try await repository.fetchAll(
                page: nextPage,
                pageSize: pageSize,
                genre: selectedGenre,
                author: selectedAuthor
            )
            items.append(contentsOf: response.items ?? [])
            currentPage = nextPage
            hasMorePages = (response.page ?? nextPage) < (response.totalPages ?? nextPage)
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoadingMore = false
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
        repository.invalidateCache()
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
        case .authorZA:
            return audiobooks.sorted { ($0.author ?? "") > ($1.author ?? "") }
        case .newest:
            return audiobooks.sorted { ($0.createdAt ?? "") > ($1.createdAt ?? "") }
        case .oldest:
            return audiobooks.sorted { ($0.createdAt ?? "") < ($1.createdAt ?? "") }
        case .highestRated:
            return audiobooks.sorted { ($0.avgRating ?? 0) > ($1.avgRating ?? 0) }
        case .mostBooks:
            return audiobooks
        }
    }
}
