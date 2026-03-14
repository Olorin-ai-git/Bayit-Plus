import BayitCore
import Foundation

/// Storage monitoring: warns at 5 GB remaining, blocks at 500 MB.
extension DownloadManager {
    static let storageWarningThresholdBytes: Int64 = 5 * 1_073_741_824
    static let storageBlockThresholdBytes: Int64 = 500 * 1_048_576

    /// Available disk space in bytes.
    var availableDiskSpace: Int64 {
        let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        guard let values = try? url.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey]),
              let available = values.volumeAvailableCapacityForImportantUsage else { return 0 }
        return available
    }

    /// Total size of all downloaded files in bytes.
    @MainActor
    var totalDownloadedSize: Int64 {
        downloads.compactMap(\.fileSize).reduce(0, +)
    }

    /// Whether storage is below warning threshold (5 GB).
    var isStorageLow: Bool {
        availableDiskSpace < Self.storageWarningThresholdBytes
    }

    /// Whether storage is critically low (<500 MB) — block new downloads.
    var isStorageCritical: Bool {
        availableDiskSpace < Self.storageBlockThresholdBytes
    }

    /// Check storage before starting a download.
    /// Returns nil if OK, or a localized warning message.
    func storageCheck() -> String? {
        if isStorageCritical {
            return localization.t("downloads.storageCritical")
        }
        if isStorageLow {
            return localization.t("downloads.storageLow")
        }
        return nil
    }

    /// Format bytes to human-readable string.
    static func formatBytes(_ bytes: Int64) -> String {
        let gb = Double(bytes) / 1_073_741_824
        if gb >= 1.0 { return String(format: "%.1f GB", gb) }
        let mb = Double(bytes) / 1_048_576
        return String(format: "%.0f MB", mb)
    }
}
