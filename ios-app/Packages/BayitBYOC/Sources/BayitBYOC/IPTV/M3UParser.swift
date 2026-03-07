import Foundation

/// Parses M3U/M3U8 IPTV playlists into BYOCChannel arrays.
public enum M3UParser {
    /// Parse M3U content string into channels.
    public static func parse(
        _ content: String,
        sourceId: String
    ) -> [BYOCChannel] {
        let lines = content
            .replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
            .components(separatedBy: "\n")
            .map { $0.trimmingCharacters(in: .whitespaces) }

        var channels: [BYOCChannel] = []
        var pendingInfo: ExtInfLine?

        for line in lines {
            if line.isEmpty || line == "#EXTM3U" { continue }

            if line.hasPrefix("#EXTINF:") {
                pendingInfo = parseExtInfLine(line)
            } else if !line.hasPrefix("#"), let info = pendingInfo {
                if let streamURL = URL(string: line) {
                    let channel = BYOCChannel(
                        name: info.displayName,
                        logoURL: info.logoURL,
                        group: info.group,
                        streamURL: streamURL,
                        sourceId: sourceId,
                        attributes: info.attributes
                    )
                    channels.append(channel)
                }
                pendingInfo = nil
            }
        }
        return channels
    }

    /// Group channels by their group attribute.
    public static func groupChannels(
        _ channels: [BYOCChannel]
    ) -> [BYOCChannelGroup] {
        let grouped = Dictionary(grouping: channels) { $0.group }
        return grouped
            .map { BYOCChannelGroup(name: $0.key, channels: $0.value) }
            .sorted { $0.name < $1.name }
    }
}

// MARK: - Private

private struct ExtInfLine {
    let displayName: String
    let logoURL: URL?
    let group: String
    let attributes: [String: String]
}

private let attributePattern = try! NSRegularExpression(
    pattern: #"([\w-]+)="([^"]*)"#,
    options: []
)

private func parseExtInfLine(_ line: String) -> ExtInfLine {
    let afterPrefix = String(line.dropFirst("#EXTINF:".count))
    let parts = afterPrefix.components(separatedBy: ",")
    let attributeString = parts.first ?? ""
    let displayName = parts.dropFirst().joined(separator: ",").trimmingCharacters(in: .whitespaces)

    let attrs = parseAttributes(attributeString)

    let tvgName = attrs["tvg-name"] ?? ""
    let name = displayName.isEmpty ? tvgName : displayName
    let logoStr = attrs["tvg-logo"] ?? ""
    let group = attrs["group-title"] ?? "Uncategorized"

    return ExtInfLine(
        displayName: name.isEmpty ? "Unknown Channel" : name,
        logoURL: logoStr.isEmpty ? nil : URL(string: logoStr),
        group: group,
        attributes: attrs
    )
}

private func parseAttributes(_ str: String) -> [String: String] {
    let nsStr = str as NSString
    let range = NSRange(location: 0, length: nsStr.length)
    let matches = attributePattern.matches(in: str, options: [], range: range)

    var result: [String: String] = [:]
    for match in matches {
        let key = nsStr.substring(with: match.range(at: 1))
        let value = nsStr.substring(with: match.range(at: 2))
        result[key] = value
    }
    return result
}
