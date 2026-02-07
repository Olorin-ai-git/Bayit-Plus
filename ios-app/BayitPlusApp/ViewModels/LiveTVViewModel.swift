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

    @MainActor
    func loadChannels() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchChannels()
            channels = response.channels
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
            let response = try await repository.fetchChannels()
            channels = response.channels
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
