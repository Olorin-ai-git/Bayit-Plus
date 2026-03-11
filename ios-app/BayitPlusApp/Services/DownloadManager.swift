import AVFoundation
import BayitCore
import BayitLocalization
import Foundation
import Observation

/// Manages background downloads with progress tracking, retry, and offline playback.
/// Uses AVAssetDownloadURLSession for HLS (.m3u8) streams and URLSession for direct files.
@Observable
final class DownloadManager: NSObject, URLSessionDownloadDelegate, @unchecked Sendable {
    var downloads: [LocalDownload] = []

    let userRepository: any UserRepository
    let store: DownloadStore
    let localization: LocalizationManager
    let logger = BayitLogger(category: "DownloadManager")
    var urlSession: URLSession!
    #if os(iOS)
        var avSession: AVAssetDownloadURLSession!
    #endif

    let taskLock = NSLock()
    var tasksByDownloadId: [String: URLSessionTask] = [:]
    var downloadIdByTaskId: [Int: String] = [:]

    init(userRepository: any UserRepository, store: DownloadStore, localization: LocalizationManager) {
        self.userRepository = userRepository
        self.store = store
        self.localization = localization
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
            download.error = localization.t("errors.noDownloadUrl")
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
    func downloadAll(_ requests: [DownloadRequest]) async {
        for request in requests {
            await startDownload(request)
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
}
