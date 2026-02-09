import Foundation

// MARK: - Mivzakim (Breaking News) Models

/// A single breaking news item from Ynet
struct MivzakimItem: Decodable, Sendable, Identifiable {
    let title: String
    let link: String
    let published: String
    let summary: String
    let source: String

    var id: String { link }

    /// Formats the published date as HH:mm in Israel timezone.
    /// API returns RFC 2822 format: "Mon, 09 Feb 2026 02:41:44 +0200"
    var formattedTime: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss Z"
        guard let date = formatter.date(from: published) else {
            return ""
        }
        let display = DateFormatter()
        display.dateFormat = "HH:mm"
        display.timeZone = TimeZone(identifier: "Asia/Jerusalem")
        return display.string(from: date)
    }
}

/// Response from GET /api/v1/news/mivzakim
struct MivzakimResponse: Decodable, Sendable {
    let items: [MivzakimItem]
    let total: Int
    let updatedAt: String
}
