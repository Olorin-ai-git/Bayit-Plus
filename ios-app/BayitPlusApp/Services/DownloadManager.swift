import AVFoundation
import BayitCore
import Foundation
import Observation

/// Manages background downloads with progress tracking, retry, and offline playback.
/// Uses AVAssetDownloadURLSession for HLS (.m3u8) streams and URLSession for direct files.
@Observable
#if os(iOS)
final class DownloadManager: NSObject, URLSessionDownloadDelegate, AVAssetDownloadDelegate, @unchecked Sendable {
#else
final class DownloadManager: NSObject, URLSessionDownloadDelegate, @unchecked Sendable {
#endif

    private(set) var downloads: [LocalDownload] = []

    private let userRepository: any UserRepository
    private let store: DownloadStore
    private let logger = BayitLogger(category: "DownloadManager")
    private var urlSession: URLSession!
    #if os(iOS)
    private var avSession: AVAssetDownloadURLSession!
    #endif

    private let taskLock = NSLock()
    private var tasksByDownloadId: [String: URLSessionTask] = [:]
    private var downloadIdByTaskId: [Int: String] = [:]

    init(userRepository: any UserRepository, store: DownloadStore) {
        self.userRepository = userRepository
        self.store = store
        super.init()
        let bgConfig = URLSessionConfiguration.background(withIdentifier: "tv.bayit.plus.downloads")
        bgConfig.isDiscretionary = false
        bgConfig.sessionSendsLaunchEvents = true
        urlSession = URLSession(configuration: bgConfig, delegate: self, delegateQueue: nil)

        #if os(iOS)
        let avConfig = URLSessionConfiguration.background(withIdentifier: "tv.bayit.plus.av-downloads")
        avConfig.isDiscretionary = false
        avConfig.sessionSendsLaunchEvents = true
        avSession = AVAssetDownloadURLSession(configuration: avConfig, assetDownloadDelegate: self, delegateQueue: nil)
        #endif
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
        download.sourceUrl = request.streamUrl
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

            #if os(iOS)
            if isHLSURL(downloadURL) {
                let asset = AVURLAsset(url: downloadURL)
                guard let task = avSession.makeAssetDownloadTask(
                    asset: asset,
                    assetTitle: request.title,
                    assetArtworkData: nil,
                    options: nil
                ) else {
                    throw NSError(domain: "DownloadManager", code: -1,
                                  userInfo: [NSLocalizedDescriptionKey: "Failed to create HLS download task"])
                }
                registerTask(task, for: download.id)
                task.resume()
            } else {
                let task = urlSession.downloadTask(with: downloadURL)
                registerTask(task, for: download.id)
                task.resume()
            }
            #else
            let task = urlSession.downloadTask(with: downloadURL)
            registerTask(task, for: download.id)
            task.resume()
            #endif
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
            for request in requests { await startDownload(request) }
        }
    }

    @MainActor
    func cancelDownload(id: String) {
        taskForDownload(id)?.cancel()
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
            contentType: old.contentType,
            streamUrl: old.sourceUrl
        ))
    }

    @MainActor
    func deleteDownload(id: String) async {
        taskForDownload(id)?.cancel()
        unregisterTask(downloadId: id)
        guard let idx = downloads.firstIndex(where: { $0.id == id }) else { return }
        let download = downloads[idx]
        removeLocalFile(at: download.filePath, isAbsolute: download.isHLSDownload)
        if let serverId = download.serverDownloadId {
            do { _ = try await userRepository.deleteDownload(downloadId: serverId) } catch {
                logger.error("Failed to delete server download", error: error)
            }
        }
        downloads.remove(at: idx)
        await store.remove(id: id)
    }

    @MainActor
    func clearAllDownloads() async {
        let all = downloads
        for download in all {
            taskForDownload(download.id)?.cancel()
            unregisterTask(downloadId: download.id)
            removeLocalFile(at: download.filePath, isAbsolute: download.isHLSDownload)
            if let serverId = download.serverDownloadId {
                do { _ = try await userRepository.deleteDownload(downloadId: serverId) } catch {
                    logger.error("Failed to delete server download", error: error)
                }
            }
        }
        downloads.removeAll()
        await store.save([])
    }

    @MainActor
    func localDownload(for contentId: String) -> LocalDownload? {
        downloads.first { $0.contentId == contentId && $0.status == .completed }
    }

    @MainActor
    func playLocalDownload(id: String) -> URL? {
        guard let d = downloads.first(where: { $0.id == id }),
              d.status == .completed, let path = d.filePath else { return nil }
        if d.isHLSDownload { return URL(fileURLWithPath: path) }
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        return docs.appendingPathComponent(path)
    }

    // MARK: - Task Registry

    private func registerTask(_ task: URLSessionTask, for downloadId: String) {
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

    private func taskForDownload(_ id: String) -> URLSessionTask? {
        taskLock.withLock { tasksByDownloadId[id] }
    }

    private func downloadId(forTaskId taskId: Int) -> String? {
        taskLock.withLock { downloadIdByTaskId[taskId] }
    }

    // MARK: - Helpers

    private func isHLSURL(_ url: URL) -> Bool {
        url.pathExtension.lowercased() == "m3u8" || url.absoluteString.contains(".m3u8")
    }

    @MainActor
    private func upsertLocal(_ download: LocalDownload) {
        if let idx = downloads.firstIndex(where: { $0.id == download.id }) {
            downloads[idx] = download
        }
        Task { await store.upsert(download) }
    }

    private func removeLocalFile(at path: String?, isAbsolute: Bool) {
        guard let path else { return }
        let url = isAbsolute
            ? URL(fileURLWithPath: path)
            : FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!.appendingPathComponent(path)
        try? FileManager.default.removeItem(at: url)
    }

    // MARK: - URLSessionDownloadDelegate (direct file downloads)

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask,
                    didWriteData bytesWritten: Int64, totalBytesWritten: Int64,
                    totalBytesExpectedToWrite: Int64) {
        guard let id = downloadId(forTaskId: downloadTask.taskIdentifier) else { return }
        let progress = totalBytesExpectedToWrite > 0
            ? Double(totalBytesWritten) / Double(totalBytesExpectedToWrite) : 0
        Task { @MainActor [weak self] in
            guard let self, let idx = downloads.firstIndex(where: { $0.id == id }) else { return }
            downloads[idx].progress = progress
            downloads[idx].fileSize = totalBytesExpectedToWrite
        }
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask,
                    didFinishDownloadingTo location: URL) {
        guard let id = downloadId(forTaskId: downloadTask.taskIdentifier) else { return }
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

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let error else { return }
        let nsError = error as NSError
        guard nsError.code != NSURLErrorCancelled,
              let id = downloadId(forTaskId: task.taskIdentifier) else { return }
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

    // MARK: - AVAssetDownloadDelegate (HLS downloads, iOS only)

    #if os(iOS)
    func urlSession(_ session: URLSession, assetDownloadTask: AVAssetDownloadTask,
                    didLoad timeRange: CMTimeRange,
                    totalTimeRangesLoaded loadedTimeRanges: [NSValue],
                    timeRangeExpectedToLoad: CMTimeRange) {
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

    func urlSession(_ session: URLSession, assetDownloadTask: AVAssetDownloadTask,
                    didFinishDownloadingTo location: URL) {
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
    #endif
}
