import Foundation
import Observation

/// ViewModel for culture content - manages Jerusalem and Tel Aviv content with auto-refresh
@MainActor
@Observable
final class CultureContentViewModel {
    private(set) var jerusalemItems: [CultureItem] = []
    private(set) var telAvivItems: [CultureItem] = []
    private(set) var categories: [CultureCategory] = []
    private(set) var isLoading = false
    private(set) var error: String?

    var selectedCategory: String?

    private let repository: any CultureRepository

    @ObservationIgnored
    nonisolated(unsafe) private var autoRefreshTask: Task<Void, Never>?

    private let autoRefreshIntervalSeconds: TimeInterval = 900

    init(repository: any CultureRepository) {
        self.repository = repository
    }

    deinit {
        autoRefreshTask?.cancel()
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            async let jerusalemResult = repository.fetchJerusalemContent(
                category: selectedCategory,
                page: nil,
                limit: nil
            )
            async let telAvivResult = repository.fetchTelAvivContent(
                category: selectedCategory,
                page: nil,
                limit: nil
            )
            async let categoriesResult = repository.fetchCultureCategories(
                cultureId: "israeli"
            )

            let (jerusalemResponse, telAvivResponse, categoriesResponse) = try await (
                jerusalemResult, telAvivResult, categoriesResult
            )

            jerusalemItems = jerusalemResponse.items
            telAvivItems = telAvivResponse.items
            categories = categoriesResponse
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
        startAutoRefresh()
    }

    @MainActor
    func filterByCategory(_ category: String?) async {
        selectedCategory = category
        await load()
    }

    @MainActor
    func refresh() async {
        await load()
    }

    private func startAutoRefresh() {
        autoRefreshTask?.cancel()
        autoRefreshTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(self?.autoRefreshIntervalSeconds ?? 900))
                guard !Task.isCancelled else { break }
                await self?.refresh()
            }
        }
    }

    @MainActor
    func stopAutoRefresh() {
        autoRefreshTask?.cancel()
        autoRefreshTask = nil
    }
}
