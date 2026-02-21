import AVFoundation
import BayitCore
import Foundation

// MARK: - Task Registry, Delegates, and File Helpers

extension DownloadManager {
    // MARK: - Task Registry

    func registerTask(_ task: URLSessionTask, for downloadId: String) {
        taskLock.withLock {
            tasksByDownloadId[downloadId] = task
            downloadIdByTaskId[task.taskIdentifier] = downloadId
        }
    }

    func unregisterTask(downloadId: String) {
        taskLock.withLock {
            if let task = tasksByDownloadId.removeValue(forKey: downloadId) {
                downloadIdByTaskId.removeValue(forKey: task.taskIdentifier)
            }
        }
    }

    func taskForDownload(_ id: String) -> URLSessionTask? {
        taskLock.withLock { tasksByDownloadId[id] }
    }

    func downloadId(forTaskId taskId: Int) -> String? {
        taskLock.withLock { downloadIdByTaskId[taskId] }
    }

    // MARK: - Helpers

    func isHLSURL(_ url: URL) -> Bool {
        url.pathExtension.lowercased() == "m3u8" || url.absoluteString.contains(".m3u8")
    }

    @MainActor
    func upsertLocal(_ download: LocalDownload) {
        if let idx = downloads.firstIndex(where: { $0.id == download.id }) {
            downloads[idx] = download
        }
        Task { await store.upsert(download) }
    }

    func removeLocalFile(at path: String?, isAbsolute: Bool) {
        guard let path else { return }
        let url = isAbsolute
            ? URL(fileURLWithPath: path)
            : FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!.appendingPathComponent(path)
        try? FileManager.default.removeItem(at: url)
    }
}

// MARK: - URLSessionDownloadDelegate (direct file downloads)

extension DownloadManager {
    func handleDownloadProgress(
        taskId: Int, totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64
    ) {
        guard let id = downloadId(forTaskId: taskId) else { return }
        let progress = totalBytesExpectedToWrite > 0
            ? Double(totalBytesWritten) / Double(totalBytesExpectedToWrite) : 0
        Task { @MainActor [weak self] in
            guard let self, let idx = downloads.firstIndex(where: { $0.id == id }) else { return }
            downloads[idx].progress = progress
            downloads[idx].fileSize = totalBytesExpectedToWrite
        }
    }

    func handleDownloadCompletion(taskId: Int, location: URL) {
        guard let id = downloadId(forTaskId: taskId) else { return }
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let destDir = docs.appendingPathComponent("BayitDownloads", isDirectory: true)
        try? FileManager.default.createDirectory(at: destDir, withIntermediateDirectories: true)
        let ext = location.pathExtension.isEmpty ? "mp4" : location.pathExtension
        let relativePath = "BayitDownloads/\(id).\(ext)"
        try? FileManager.default.moveItem(at: location, to: docs.appendingPathComponent(relativePath))
        unregisterTask(downloadId: id)
        Task { @MainActor [weak self] in
            guard let self, let idx = downloads.firstIndex(where: { $0.id == id }) else { return }
            downloads[idx].status = .completed
            downloads[idx].progress = 1.0
            downloads[idx].filePath = relativePath
            let d = downloads[idx]
            await store.upsert(d)
        }
    }

    func handleDownloadError(taskId: Int, error: Error) {
        let nsError = error as NSError
        guard nsError.code != NSURLErrorCancelled,
              let id = downloadId(forTaskId: taskId) else { return }
        unregisterTask(downloadId: id)
        Task { @MainActor [weak self] in
            guard let self, let idx = downloads.firstIndex(where: { $0.id == id }) else { return }
            downloads[idx].status = .failed
            downloads[idx].error = error.localizedDescription
            let d = downloads[idx]
            await store.upsert(d)
        }
        logger.error("Download failed", error: error, context: ["downloadId": id])
    }
}

// MARK: - AVAssetDownloadDelegate (HLS downloads, iOS only)

#if os(iOS)
    extension DownloadManager: AVAssetDownloadDelegate {
        func urlSession(
            _: URLSession, assetDownloadTask: AVAssetDownloadTask,
            didLoad _: CMTimeRange,
            totalTimeRangesLoaded loadedTimeRanges: [NSValue],
            timeRangeExpectedToLoad: CMTimeRange
        ) {
            guard let id = downloadId(forTaskId: assetDownloadTask.taskIdentifier),
                  timeRangeExpectedToLoad.duration.seconds > 0 else { return }
            let progress = loadedTimeRanges.reduce(0.0) { acc, val in
                acc + val.timeRangeValue.duration.seconds / timeRangeExpectedToLoad.duration.seconds
            }
            Task { @MainActor [weak self] in
                guard let self, let idx = downloads.firstIndex(where: { $0.id == id }) else { return }
                downloads[idx].progress = min(progress, 0.99)
            }
        }

        func urlSession(
            _: URLSession, assetDownloadTask: AVAssetDownloadTask,
            didFinishDownloadingTo location: URL
        ) {
            guard let id = downloadId(forTaskId: assetDownloadTask.taskIdentifier) else { return }
            let absolutePath = location.path
            unregisterTask(downloadId: id)
            Task { @MainActor [weak self] in
                guard let self, let idx = downloads.firstIndex(where: { $0.id == id }) else { return }
                downloads[idx].status = .completed
                downloads[idx].progress = 1.0
                downloads[idx].filePath = absolutePath
                downloads[idx].isHLSDownload = true
                let d = downloads[idx]
                await store.upsert(d)
            }
        }
    }
#endif
