import BayitCore
import Foundation
import Observation

/// Manages background URLSession downloads with progress tracking, retry, and offline playback.
@Observable
final class DownloadManager: NSObject, URLSessionDownloadDelegate, @unchecked Sendable {

    private(set) var downloads: [LocalDownload] = []

    private let userRepository: any UserRepository
    private let store: DownloadStore
    private let logger = BayitLogger(category: "DownloadManager")
    private var urlSession: URLSession!

    private let taskLock = NSLock()
    private var tasksByDownloadId: [String: URLSessionDownloadTask] = [:]
    private var downloadIdByTaskId: [Int: String] = [:]

    init(userRepository: any UserRepository, store: DownloadStore) {
        self.userRepository = userRepository
        self.store = store
        super.init()
        let config = URLSessionConfiguration.background(withIdentifier: "tv.bayit.plus.downloads")
        config.isDiscretionary = false
        config.sessionSendsLaunchEvents = true
        urlSession = URLSession(configuration: config, delegate: self, delegateQueue: nil)
    }

    // MARK: - Public API

    @MainActor
    func initialize() async {
        let saved = await store.load()
        downloads = saved.map {
            var d = $0
            if d.status == .downloading || d.status == .queued { d.status = .paused }
            return d
        }
    }

    @MainActor
    func startDownload(_ request: DownloadRequest) async {
        guard !downloads.contains(where: { $0.contentId == request.contentId && $0.status != .failed }) else { return }
        var download = LocalDownload(
            contentId: request.contentId,
            title: request.title,
            thumbnail: request.thumbnail,
            contentType: request.contentType
        )
        downloads.append(download)
        await store.upsert(download)

        guard let urlString = request.streamUrl, let downloadURL = URL(string: urlString) else {
            download.status = .failed
            download.error = "No download URL available for this content"
            upsertLocal(download)
            logger.error("No stream URL for download", context: ["contentId": request.contentId])
            return
        }

        do {
            let response = try await userRepository.startDownload(
                request: DownloadStartRequest(
                    contentId: request.contentId,
                    contentType: request.contentType.backendString,
                    quality: nil
                )
            )
            download.serverDownloadId = response.downloadId
            download.status = .downloading
            upsertLocal(download)
            let task = urlSession.downloadTask(with: downloadURL)
            registerTask(task, for: download.id)
            task.resume()
        } catch {
            download.status = .failed
            download.error = error.localizedDescription
            upsertLocal(download)
            logger.error("Failed to start download", error: error, context: ["contentId": request.contentId])
        }
    }

    @MainActor
    func downloadAll(_ requests: [DownloadRequest]) {
        Task { @MainActor in
            for request in requests {
                await startDownload(request)
            }
        }
    }

    @MainActor
    func cancelDownload(id: String) {
        tasksByDownloadId(id)?.cancel()
        unregisterTask(downloadId: id)
        if let idx = downloads.firstIndex(where: { $0.id == id }) {
            downloads[idx].status = .paused
            let d = downloads[idx]
            Task { await store.upsert(d) }
        }
    }

    @MainActor
    func retryDownload(id: String) async {
        guard let idx = downloads.firstIndex(where: { $0.id == id }) else { return }
        let old = downloads[idx]
        downloads.remove(at: idx)
        await store.remove(id: id)
        await startDownload(DownloadRequest(
            contentId: old.contentId,
            title: old.title,
            thumbnail: old.thumbnail,
            contentType: old.contentType
        ))
    }

    @MainActor
    func deleteDownload(id: String) async {
        cancelDownload(id: id)
        guard let idx = downloads.firstIndex(where: { $0.id == id }) else { return }
        let download = downloads[idx]
        removeLocalFile(at: download.filePath)
        if let serverId = download.serverDownloadId {
            do { _ = try await userRepository.deleteDownload(downloadId: serverId) } catch {
                logger.error("Failed to delete server download", error: error)
            }
        }
        downloads.remove(at: idx)
        await store.remove(id: id)
    }

    @MainActor
    func playLocalDownload(id: String) -> URL? {
        guard let d = downloads.first(where: { $0.id == id }), d.status == .completed,
              let path = d.filePath else { return nil }
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        return docs.appendingPathComponent(path)
    }

    // MARK: - Thread-safe Task Registry

    private func registerTask(_ task: URLSessionDownloadTask, for downloadId: String) {
        taskLock.withLock {
            tasksByDownloadId[downloadId] = task
            downloadIdByTaskId[task.taskIdentifier] = downloadId
        }
    }

    private func unregisterTask(downloadId: String) {
        taskLock.withLock {
            if let task = tasksByDownloadId.removeValue(forKey: downloadId) {
                downloadIdByTaskId.removeValue(forKey: task.taskIdentifier)
            }
        }
    }

    private func tasksByDownloadId(_ id: String) -> URLSessionDownloadTask? {
        taskLock.withLock { tasksByDownloadId[id] }
    }

    private func downloadId(forTaskId taskId: Int) -> String? {
        taskLock.withLock { downloadIdByTaskId[taskId] }
    }

    // MARK: - Private Helpers

    @MainActor
    private func upsertLocal(_ download: LocalDownload) {
        if let idx = downloads.firstIndex(where: { $0.id == download.id }) {
            downloads[idx] = download
        }
        Task { await store.upsert(download) }
    }

    private func removeLocalFile(at relativePath: String?) {
        guard let path = relativePath else { return }
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        try? FileManager.default.removeItem(at: docs.appendingPathComponent(path))
    }

    // MARK: - URLSessionDownloadDelegate

    func urlSession(
        _ session: URLSession,
        downloadTask: URLSessionDownloadTask,
        didWriteData bytesWritten: Int64,
        totalBytesWritten: Int64,
        totalBytesExpectedToWrite: Int64
    ) {
        guard let downloadId = downloadId(forTaskId: downloadTask.taskIdentifier) else { return }
        let progress = totalBytesExpectedToWrite > 0
            ? Double(totalBytesWritten) / Double(totalBytesExpectedToWrite) : 0
        Task { @MainActor [weak self] in
            guard let self, let idx = downloads.firstIndex(where: { $0.id == downloadId }) else { return }
            downloads[idx].progress = progress
            downloads[idx].fileSize = totalBytesExpectedToWrite
        }
    }

    func urlSession(
        _ session: URLSession,
        downloadTask: URLSessionDownloadTask,
        didFinishDownloadingTo location: URL
    ) {
        guard let downloadId = downloadId(forTaskId: downloadTask.taskIdentifier) else { return }
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let destDir = docs.appendingPathComponent("BayitDownloads", isDirectory: true)
        try? FileManager.default.createDirectory(at: destDir, withIntermediateDirectories: true)
        let ext = location.pathExtension.isEmpty ? "mp4" : location.pathExtension
        let relativePath = "BayitDownloads/\(downloadId).\(ext)"
        let destURL = docs.appendingPathComponent(relativePath)
        try? FileManager.default.moveItem(at: location, to: destURL)
        unregisterTask(downloadId: downloadId)
        Task { @MainActor [weak self] in
            guard let self, let idx = downloads.firstIndex(where: { $0.id == downloadId }) else { return }
            downloads[idx].status = .completed
            downloads[idx].progress = 1.0
            downloads[idx].filePath = relativePath
            let d = downloads[idx]
            await store.upsert(d)
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let error else { return }
        let nsError = error as NSError
        guard nsError.code != NSURLErrorCancelled,
              let downloadId = downloadId(forTaskId: task.taskIdentifier) else { return }
        unregisterTask(downloadId: downloadId)
        Task { @MainActor [weak self] in
            guard let self, let idx = downloads.firstIndex(where: { $0.id == downloadId }) else { return }
            downloads[idx].status = .failed
            downloads[idx].error = error.localizedDescription
            let d = downloads[idx]
            await store.upsert(d)
        }
        logger.error("Download failed", error: error, context: ["downloadId": downloadId])
    }
}
