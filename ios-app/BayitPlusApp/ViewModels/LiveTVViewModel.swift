import Foundation
import Observation

/// ViewModel for the Live TV screen - manages channel grid and live status
@Observable
final class LiveTVViewModel {
    private(set) var channels: [LiveChannelItem] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any LiveTVRepository

    init(repository: any LiveTVRepository) {
        self.repository = repository
    }

    // TEMPORARILY HIDDEN: King 5, CNN, ABC channels hidden per product request
    private static let hiddenChannelKeywords = ["king 5", "king5", "cnn", "abc"]

    private func filterHiddenChannels(_ items: [LiveChannelItem]) -> [LiveChannelItem] {
        items.filter { channel in
            guard let name = channel.name?.lowercased() else { return true }
            return !Self.hiddenChannelKeywords.contains(where: { name.contains($0) })
        }
    }

    @MainActor
    func loadChannels() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchChannels(cultureId: nil, category: nil)
            channels = filterHiddenChannels(response.channels)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func refresh() async {
        error = nil
        isLoading = true

        do {
            let response = try await repository.fetchChannels(cultureId: nil, category: nil)
            channels = filterHiddenChannels(response.channels)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
