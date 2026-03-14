import BayitCore
import Foundation

/// Auto-retry logic: 3 attempts with exponential backoff.
extension DownloadManager {
    static let maxRetryAttempts = 3
    private static let baseRetryDelay: TimeInterval = 2.0

    /// Retry delay for a given attempt (exponential: 2s, 4s, 8s).
    static func retryDelay(attempt: Int) -> TimeInterval {
        baseRetryDelay * pow(2.0, Double(attempt))
    }

    /// Auto-retry a failed download if under the retry limit.
    /// Returns true if retry was scheduled, false if exhausted.
    @MainActor
    func autoRetry(id: String) async -> Bool {
        guard let idx = downloads.firstIndex(where: { $0.id == id }),
              downloads[idx].status == .failed else { return false }

        let retryCount = downloads[idx].retryCount
        guard retryCount < Self.maxRetryAttempts else {
            logger.warning("Retry limit reached", context: [
                "id": id,
                "attempts": "\(retryCount)",
            ])
            return false
        }

        let delay = Self.retryDelay(attempt: retryCount)
        logger.info("Scheduling retry", context: [
            "id": id,
            "attempt": "\(retryCount + 1)",
            "delaySeconds": "\(delay)",
        ])

        downloads[idx].retryCount += 1
        downloads[idx].status = .queued
        downloads[idx].error = nil
        let d = downloads[idx]
        await store.upsert(d)

        try? await Task.sleep(for: .seconds(delay))
        await processQueue()
        return true
    }

    /// Called from delegate when a download fails — triggers auto-retry.
    @MainActor
    func handleFailureWithRetry(downloadId: String) async {
        let retried = await autoRetry(id: downloadId)
        if !retried {
            await processQueue()
        }
    }
}
