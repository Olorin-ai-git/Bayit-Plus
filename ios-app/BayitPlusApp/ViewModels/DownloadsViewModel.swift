import Foundation
import Observation

/// ViewModel for the Downloads screen - manages offline downloaded content.
@Observable
final class DownloadsViewModel {
    private(set) var items: [DownloadItem] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any UserRepository

    init(repository: any UserRepository) {
        self.repository = repository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchDownloads()
            items = response.items
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func deleteDownload(downloadId: String) async {
        do {
            _ = try await repository.deleteDownload(downloadId: downloadId)
            items.removeAll { $0.id == downloadId }
        } catch {
            self.error = error.localizedDescription
        }
    }

    @MainActor
    func startDownload(contentId: String, quality: String?) async -> DownloadStartResponse? {
        do {
            let request = DownloadStartRequest(
                contentId: contentId,
                quality: quality
            )
            let response = try await repository.startDownload(request: request)
            await load()
            return response
        } catch {
            self.error = error.localizedDescription
            return nil
        }
    }

    /// Total storage used by downloads in bytes.
    var totalStorageUsed: Int {
        items.compactMap(\.fileSize).reduce(0, +)
    }
}
