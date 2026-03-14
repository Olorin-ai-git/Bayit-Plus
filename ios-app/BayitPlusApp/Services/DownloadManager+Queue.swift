import AVFoundation
import BayitCore
import Foundation

/// Concurrency queue: max 3 concurrent downloads, FIFO ordering.
extension DownloadManager {
    static let maxConcurrentDownloads = 3

    /// Count of currently active (downloading) items.
    @MainActor
    var activeDownloadCount: Int {
        downloads.filter { $0.status == .downloading }.count
    }

    /// Items waiting in queue (status == .queued).
    @MainActor
    var queuedDownloads: [LocalDownload] {
        downloads.filter { $0.status == .queued }.sorted { $0.createdAt < $1.createdAt }
    }

    /// Start queued downloads if slots are available.
    /// Call after a download completes, fails, or is deleted.
    @MainActor
    func processQueue() async {
        let available = Self.maxConcurrentDownloads - activeDownloadCount
        guard available > 0 else { return }

        let toStart = Array(queuedDownloads.prefix(available))
        for download in toStart {
            guard let urlString = download.sourceUrl, let url = URL(string: urlString) else {
                if let idx = downloads.firstIndex(where: { $0.id == download.id }) {
                    downloads[idx].status = .failed
                    downloads[idx].error = localization.t("errors.noDownloadUrl")
                    upsertLocal(downloads[idx])
                }
                continue
            }
            if let idx = downloads.firstIndex(where: { $0.id == download.id }) {
                downloads[idx].status = .downloading
                upsertLocal(downloads[idx])
            }
            #if os(iOS)
                if isHLSURL(url) {
                    let asset = AVFoundation.AVURLAsset(url: url)
                    guard let task = avSession.makeAssetDownloadTask(
                        asset: asset, assetTitle: download.title,
                        assetArtworkData: nil, options: nil
                    ) else { continue }
                    registerTask(task, for: download.id)
                    task.resume()
                } else {
                    let task = urlSession.downloadTask(with: url)
                    registerTask(task, for: download.id)
                    task.resume()
                }
            #else
                let task = urlSession.downloadTask(with: url)
                registerTask(task, for: download.id)
                task.resume()
            #endif
        }
    }

    /// Enqueue a download request respecting concurrency limit.
    /// If under the limit, starts immediately; otherwise queues.
    @MainActor
    func enqueueDownload(_ request: DownloadRequest) async {
        guard !downloads.contains(where: {
            $0.contentId == request.contentId && $0.status != .failed
        }) else { return }

        if activeDownloadCount < Self.maxConcurrentDownloads {
            await startDownload(request)
        } else {
            var download = LocalDownload(
                contentId: request.contentId,
                title: request.title,
                thumbnail: request.thumbnail,
                contentType: request.contentType
            )
            download.sourceUrl = request.streamUrl
            download.status = .queued
            downloads.append(download)
            await store.upsert(download)
            logger.info("Download queued", context: [
                "contentId": request.contentId,
                "queuePosition": "\(queuedDownloads.count)",
            ])
        }
    }

    /// Enqueue multiple downloads (collection batch).
    @MainActor
    func enqueueAll(_ requests: [DownloadRequest]) async {
        for request in requests {
            await enqueueDownload(request)
        }
    }
}
