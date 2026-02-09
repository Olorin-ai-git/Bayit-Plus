import BayitCore
import Foundation
import Observation

/// View model for the Ynet Mivzakim (breaking news) widget.
/// Fetches news from /api/v1/news/mivzakim and auto-refreshes every 2 minutes.
@Observable
@MainActor
final class YnetMivzakimViewModel {
    private let repository: any NewsRepository
    private let logger = BayitLogger(category: "YnetMivzakimViewModel")
    private let maxItems: Int
    private var refreshTask: Task<Void, Never>?

    private(set) var items: [MivzakimItem] = []
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var lastUpdated: Date?

    init(repository: any NewsRepository, maxItems: Int = 10) {
        self.repository = repository
        self.maxItems = maxItems
    }

    func loadNews() async {
        isLoading = items.isEmpty
        error = nil
        do {
            let response = try await repository.fetchMivzakim(limit: maxItems)
            items = response.items
            lastUpdated = Date()
            error = nil
        } catch {
            if items.isEmpty {
                self.error = error.localizedDescription
            }
            logger.error("Failed to fetch mivzakim", error: error)
        }
        isLoading = false
    }

    func startAutoRefresh() {
        stopAutoRefresh()
        refreshTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(120))
                guard !Task.isCancelled else { break }
                await self?.loadNews()
            }
        }
    }

    func stopAutoRefresh() {
        refreshTask?.cancel()
        refreshTask = nil
    }
}
