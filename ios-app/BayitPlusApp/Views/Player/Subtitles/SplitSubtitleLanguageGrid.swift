import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Language row for split subtitle picker showing flag, native name,
/// position badge, and selection state.
struct SplitSubtitleLanguageRow: View {
    let language: String
    let isSelected: Bool
    let selectionIndex: Int?
    let onToggle: () -> Void

    var body: some View {
        let langInfo = SplitSubtitleLanguageInfo.info(for: language)

        Button(action: onToggle) {
            HStack(spacing: DesignTokens.Spacing.md) {
                Text(langInfo?.flag ?? "")
                    .font(.system(size: 20))

                Text(langInfo?.nativeName ?? language.uppercased())
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if let index = selectionIndex {
                    Text(index == 0 ? "LEFT" : "RIGHT")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            RoundedRectangle(cornerRadius: 4)
                                .fill(DesignTokens.Primary.p500)
                        )
                }

                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(DesignTokens.Primary.p500)
                }
            }
            .padding(.vertical, DesignTokens.Spacing.md)
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .fill(isSelected ? Color.purple.opacity(0.3) : Color.black.opacity(0.3))
                    .overlay(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                            .stroke(isSelected ? Color.purple.opacity(0.5) : Color.purple.opacity(0.2), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

/// Preview pane showing flag and position for split subtitle mode.
struct SplitSubtitlePreviewPane: View {
    let language: String
    let position: String

    var body: some View {
        let langInfo = SplitSubtitleLanguageInfo.info(for: language)
        VStack(spacing: 4) {
            Text(langInfo?.flag ?? "")
                .font(.system(size: 28))

            Text(position)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(DesignTokens.Text.muted)
                .tracking(0.5)
        }
        .frame(maxWidth: .infinity)
    }
}

/// Preview showing two selected languages side by side.
struct SplitSubtitlePreviewView: View {
    let languages: [String]

    var body: some View {
        HStack(alignment: .center, spacing: 0) {
            SplitSubtitlePreviewPane(language: languages[0], position: "LEFT")

            Rectangle()
                .fill(Color.white.opacity(0.25))
                .frame(width: 2, height: 40)
                .cornerRadius(1)

            SplitSubtitlePreviewPane(language: languages[1], position: "RIGHT")
        }
        .padding(.vertical, DesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(Color.black.opacity(0.4))
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}

/// Language metadata lookup for split subtitles.
enum SplitSubtitleLanguageInfo {
    struct Info {
        let nativeName: String
        let flag: String
    }

    private static let languages: [String: Info] = [
        "he": Info(nativeName: "\u{05E2}\u{05D1}\u{05E8}\u{05D9}\u{05EA}", flag: "\u{1F1EE}\u{1F1F1}"),
        "en": Info(nativeName: "English", flag: "\u{1F1FA}\u{1F1F8}"),
        "es": Info(nativeName: "Espa\u{00F1}ol", flag: "\u{1F1EA}\u{1F1F8}"),
        "ar": Info(nativeName: "\u{0627}\u{0644}\u{0639}\u{0631}\u{0628}\u{064A}\u{0629}", flag: "\u{1F1F8}\u{1F1E6}"),
        "ru": Info(nativeName: "\u{0420}\u{0443}\u{0441}\u{0441}\u{043A}\u{0438}\u{0439}", flag: "\u{1F1F7}\u{1F1FA}"),
        "fr": Info(nativeName: "Fran\u{00E7}ais", flag: "\u{1F1EB}\u{1F1F7}"),
        "de": Info(nativeName: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}"),
        "it": Info(nativeName: "Italiano", flag: "\u{1F1EE}\u{1F1F9}"),
        "pt": Info(nativeName: "Portugu\u{00EA}s", flag: "\u{1F1F5}\u{1F1F9}"),
        "yi": Info(nativeName: "\u{05D9}\u{05D9}\u{05B4}\u{05D3}\u{05D9}\u{05E9}", flag: "\u{1F54D}"),
    ]

    static func info(for code: String) -> Info? {
        languages[code]
    }
}
