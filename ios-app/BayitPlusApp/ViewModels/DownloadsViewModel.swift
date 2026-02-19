import Foundation
import Observation

/// ViewModel for the Downloads screen - groups downloads by status and exposes actions.
@MainActor
@Observable
final class DownloadsViewModel {

    private let downloadManager: DownloadManager

    init(downloadManager: DownloadManager) {
        self.downloadManager = downloadManager
    }

    var downloads: [LocalDownload] { downloadManager.downloads }

    var activeDownloads: [LocalDownload] {
        downloads.filter { $0.status == .downloading || $0.status == .queued || $0.status == .paused }
    }

    var completedDownloads: [LocalDownload] {
        downloads.filter { $0.status == .completed }
    }

    var failedDownloads: [LocalDownload] {
        downloads.filter { $0.status == .failed }
    }

    func deleteDownload(_ download: LocalDownload) {
        Task { await downloadManager.deleteDownload(id: download.id) }
    }

    func retryDownload(_ download: LocalDownload) {
        Task { await downloadManager.retryDownload(id: download.id) }
    }

    func clearAllDownloads() {
        Task { await downloadManager.clearAllDownloads() }
    }

    func localFileURL(for download: LocalDownload) -> URL? {
        downloadManager.playLocalDownload(id: download.id)
    }
}
