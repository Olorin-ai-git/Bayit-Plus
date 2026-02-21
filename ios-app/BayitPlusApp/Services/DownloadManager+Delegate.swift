import AVFoundation
import Foundation

// MARK: - URLSessionDownloadDelegate

extension DownloadManager {
    func urlSession(
        _: URLSession, downloadTask: URLSessionDownloadTask,
        didWriteData _: Int64, totalBytesWritten: Int64,
        totalBytesExpectedToWrite: Int64
    ) {
        handleDownloadProgress(
            taskId: downloadTask.taskIdentifier,
            totalBytesWritten: totalBytesWritten,
            totalBytesExpectedToWrite: totalBytesExpectedToWrite
        )
    }

    func urlSession(
        _: URLSession, downloadTask: URLSessionDownloadTask,
        didFinishDownloadingTo location: URL
    ) {
        handleDownloadCompletion(taskId: downloadTask.taskIdentifier, location: location)
    }

    func urlSession(
        _: URLSession, task: URLSessionTask,
        didCompleteWithError error: Error?
    ) {
        guard let error else { return }
        handleDownloadError(taskId: task.taskIdentifier, error: error)
    }
}
