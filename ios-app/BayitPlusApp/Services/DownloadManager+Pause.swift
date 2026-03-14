import AVFoundation
import BayitCore
import Foundation

/// True pause/resume using cancelByProducingResumeData (HLS)
/// and task.cancel() + Range header resume (direct files).
extension DownloadManager {
    /// Stored resume data for paused downloads (keyed by download ID).
    private static var resumeDataStore: [String: Data] = [:]
    private static let resumeLock = NSLock()

    // MARK: - True Pause

    @MainActor
    func pauseDownload(id: String) {
        guard let idx = downloads.firstIndex(where: { $0.id == id }),
              downloads[idx].status == .downloading || downloads[idx].status == .queued else { return }

        if let task = taskForDownload(id) {
            if let downloadTask = task as? URLSessionDownloadTask {
                downloadTask.cancel(byProducingResumeData: { [weak self] data in
                    if let data {
                        Self.resumeLock.withLock { Self.resumeDataStore[id] = data }
                    }
                    self?.unregisterTask(downloadId: id)
                })
            } else {
                task.cancel()
                unregisterTask(downloadId: id)
            }
        }

        downloads[idx].status = .paused
        let d = downloads[idx]
        Task { await store.upsert(d) }
        logger.info("Download paused", context: ["id": id])
    }

    // MARK: - True Resume

    @MainActor
    func resumeDownload(id: String) async {
        guard let idx = downloads.firstIndex(where: { $0.id == id }),
              downloads[idx].status == .paused else { return }

        downloads[idx].status = .downloading
        let download = downloads[idx]
        Task { await store.upsert(download) }

        let resumeData = Self.resumeLock.withLock { Self.resumeDataStore.removeValue(forKey: id) }

        if let resumeData {
            let task = urlSession.downloadTask(withResumeData: resumeData)
            registerTask(task, for: id)
            task.resume()
            logger.info("Download resumed with data", context: ["id": id])
            return
        }

        guard let urlString = download.sourceUrl, let url = URL(string: urlString) else {
            downloads[idx].status = .failed
            downloads[idx].error = localization.t("errors.noDownloadUrl")
            upsertLocal(downloads[idx])
            return
        }

        #if os(iOS)
            if isHLSURL(url) {
                let asset = AVURLAsset(url: url)
                guard let task = avSession.makeAssetDownloadTask(
                    asset: asset, assetTitle: download.title,
                    assetArtworkData: nil, options: nil
                ) else {
                    downloads[idx].status = .failed
                    downloads[idx].error = "Failed to create HLS task"
                    upsertLocal(downloads[idx])
                    return
                }
                registerTask(task, for: id)
                task.resume()
            } else {
                let task = urlSession.downloadTask(with: url)
                registerTask(task, for: id)
                task.resume()
            }
        #else
            let task = urlSession.downloadTask(with: url)
            registerTask(task, for: id)
            task.resume()
        #endif
        logger.info("Download resumed from scratch", context: ["id": id])
    }

    /// Check if a download has stored resume data.
    func hasResumeData(for id: String) -> Bool {
        Self.resumeLock.withLock { Self.resumeDataStore[id] != nil }
    }

    /// Clear all resume data (called on clearAllDownloads).
    func clearAllResumeData() {
        Self.resumeLock.withLock { Self.resumeDataStore.removeAll() }
    }
}
