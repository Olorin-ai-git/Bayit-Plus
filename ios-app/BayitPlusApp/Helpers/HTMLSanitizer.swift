import Foundation

extension String {
    /// Strips HTML tags and decodes HTML entities, returning plain text.
    /// Handles common tags (`<p>`, `<br>`, `<a>`, etc.) and entities (`&amp;`, `&bull;`, etc.).
    var htmlStripped: String {
        guard contains("<") || contains("&") else { return self }

        // Replace block-level tags with newlines before stripping
        var result = self
            .replacingOccurrences(of: "<br\\s*/?>", with: "\n", options: .regularExpression)
            .replacingOccurrences(of: "</p>", with: "\n", options: .caseInsensitive)
            .replacingOccurrences(of: "</div>", with: "\n", options: .caseInsensitive)
            .replacingOccurrences(of: "</li>", with: "\n", options: .caseInsensitive)

        // Strip all remaining HTML tags
        result = result.replacingOccurrences(
            of: "<[^>]+>",
            with: "",
            options: .regularExpression
        )

        // Decode common HTML entities
        let entities: [(String, String)] = [
            ("&amp;", "&"),
            ("&lt;", "<"),
            ("&gt;", ">"),
            ("&quot;", "\""),
            ("&#39;", "'"),
            ("&apos;", "'"),
            ("&nbsp;", " "),
            ("&bull;", "\u{2022}"),
            ("&ndash;", "\u{2013}"),
            ("&mdash;", "\u{2014}"),
            ("&laquo;", "\u{00AB}"),
            ("&raquo;", "\u{00BB}"),
            ("&hellip;", "\u{2026}"),
            ("&copy;", "\u{00A9}"),
            ("&reg;", "\u{00AE}"),
            ("&trade;", "\u{2122}"),
        ]

        for (entity, replacement) in entities {
            result = result.replacingOccurrences(of: entity, with: replacement)
        }

        // Decode numeric entities (&#123; and &#x1F;)
        result = result.replacingOccurrences(
            of: "&#x([0-9A-Fa-f]+);",
            with: "",
            options: .regularExpression
        )
        result = decodeNumericEntities(result)

        // Collapse multiple newlines and trim whitespace
        result = result
            .replacingOccurrences(of: "\\n{3,}", with: "\n\n", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)

        return result
    }

    /// Decode decimal numeric HTML entities like &#1234;
    private func decodeNumericEntities(_ input: String) -> String {
        var result = input
        let pattern = "&#(\\d+);"
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return result }

        let matches = regex.matches(
            in: result,
            range: NSRange(result.startIndex..., in: result)
        )

        // Process in reverse to preserve ranges
        for match in matches.reversed() {
            guard let codeRange = Range(match.range(at: 1), in: result),
                  let fullRange = Range(match.range, in: result),
                  let codePoint = UInt32(result[codeRange]),
                  let scalar = Unicode.Scalar(codePoint)
            else { continue }

            result.replaceSubrange(fullRange, with: String(scalar))
        }

        return result
    }
}
