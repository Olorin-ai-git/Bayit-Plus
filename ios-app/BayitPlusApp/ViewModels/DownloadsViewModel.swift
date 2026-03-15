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

    var downloads: [LocalDownload] {
        downloadManager.downloads
    }

    var activeDownloads: [LocalDownload] {
        downloads.filter { $0.status == .downloading || $0.status == .queued || $0.status == .paused }
    }

    var completedDownloads: [LocalDownload] {
        downloads.filter { $0.status == .completed }
    }

    var failedDownloads: [LocalDownload] {
        downloads.filter { $0.status == .failed }
    }

    func deleteDownload(_ download: LocalDownload) async {
        await downloadManager.deleteDownload(id: download.id)
    }

    func retryDownload(_ download: LocalDownload) async {
        await downloadManager.retryDownload(id: download.id)
    }

    #if os(iOS)
        func pauseDownload(_ download: LocalDownload) {
            downloadManager.pauseDownload(id: download.id)
        }

        func resumeDownload(_ download: LocalDownload) async {
            await downloadManager.resumeDownload(id: download.id)
        }
    #endif

    func clearAllDownloads() async {
        #if os(iOS)
            downloadManager.clearAllResumeData()
        #endif
        await downloadManager.clearAllDownloads()
    }

    func localFileURL(for download: LocalDownload) -> URL? {
        downloadManager.playLocalDownload(id: download.id)
    }
}
