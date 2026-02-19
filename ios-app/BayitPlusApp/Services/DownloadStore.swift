import BayitCore
import Foundation

/// Actor-based persistent store for locally tracked downloads.
/// Saves to Documents/bayit_downloads.json using atomic writes.
actor DownloadStore {

    private let storeURL: URL
    private let logger = BayitLogger(category: "DownloadStore")
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        storeURL = docs.appendingPathComponent("bayit_downloads.json")

        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
    }

    func load() -> [LocalDownload] {
        guard FileManager.default.fileExists(atPath: storeURL.path) else { return [] }
        do {
            let data = try Data(contentsOf: storeURL)
            return try decoder.decode([LocalDownload].self, from: data)
        } catch {
            logger.error("Failed to load downloads", error: error)
            return []
        }
    }

    func save(_ downloads: [LocalDownload]) {
        do {
            let data = try encoder.encode(downloads)
            try data.write(to: storeURL, options: .atomic)
        } catch {
            logger.error("Failed to save downloads", error: error)
        }
    }

    func upsert(_ download: LocalDownload) {
        var all = load()
        if let idx = all.firstIndex(where: { $0.id == download.id }) {
            all[idx] = download
        } else {
            all.append(download)
        }
        save(all)
    }

    func remove(id: String) {
        var all = load()
        all.removeAll { $0.id == id }
        save(all)
    }
}
