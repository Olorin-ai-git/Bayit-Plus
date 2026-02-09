import BayitDesignSystem
import SwiftUI

/// Single subtitle pane for split screen mode (left or right side).
/// Displays subtitles for one language with language indicator and colored border.
struct SubtitlePaneView: View {
    let cues: [SubtitleCue]
    let language: String
    let position: SubtitlePanePosition
    let settings: SubtitleSettings
    let fontSize: CGFloat

    enum SubtitlePanePosition {
        case left
        case right

        var borderColor: Color {
            switch self {
            case .left: return Color(red: 0.34, green: 0.71, blue: 0.95) // Sky blue
            case .right: return Color(red: 0.95, green: 0.71, blue: 0.34) // Orange
            }
        }

        var alignment: HorizontalAlignment {
            switch self {
            case .left: return .trailing
            case .right: return .leading
            }
        }
    }

    private var languageInfo: LanguageInfo? {
        getLanguageInfo(for: language)
    }

    private var isRTL: Bool {
        languageInfo?.isRTL ?? false
    }

    var body: some View {
        VStack(alignment: position.alignment, spacing: DesignTokens.Spacing.xs) {
            // Subtitle cues
            if cues.isEmpty {
                // Empty pane placeholder
                Rectangle()
                    .fill(Color.clear)
                    .frame(height: 28)
                    .accessibilityLabel("No \(languageInfo?.nativeName ?? language) subtitles available")
            } else {
                ForEach(cues, id: \.stableId) { cue in
                    cueView(cue)
                }
            }

            // Language indicator
            HStack(spacing: 4) {
                if let flag = languageInfo?.flag {
                    Text(flag)
                        .font(.system(size: 12))
                }
                Text(languageInfo?.nativeName ?? language.uppercased())
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(DesignTokens.Text.muted)
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, 2)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                    .fill(Color.white.opacity(0.1))
            )
        }
        .frame(maxWidth: .infinity)
    }

    private func cueView(_ cue: SubtitleCue) -> some View {
        Text(cue.text)
            .font(.system(size: fontSize, weight: .semibold))
            .foregroundColor(Color(settings.textColor))
            .multilineTextAlignment(isRTL ? .trailing : .leading)
            .environment(\.layoutDirection, isRTL ? .rightToLeft : .leftToRight)
            .lineLimit(nil)
            .padding(.vertical, 4)
            .padding(.horizontal, 12)
            .background(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(Color(settings.backgroundColor))
                    .opacity(settings.opacity)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(position.borderColor, lineWidth: 3)
                    .padding(position == .left ? EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 3) : EdgeInsets(top: 0, leading: 3, bottom: 0, trailing: 0))
            )
            .shadow(color: .black.opacity(0.8), radius: 4, x: 0, y: 0)
            .padding(.vertical, 2)
    }
}

/// Helper to get language information
private func getLanguageInfo(for code: String) -> LanguageInfo? {
    let languages: [String: LanguageInfo] = [
        "he": LanguageInfo(nativeName: "עברית", flag: "🇮🇱", isRTL: true),
        "en": LanguageInfo(nativeName: "English", flag: "🇺🇸", isRTL: false),
        "es": LanguageInfo(nativeName: "Español", flag: "🇪🇸", isRTL: false),
        "ar": LanguageInfo(nativeName: "العربية", flag: "🇸🇦", isRTL: true),
        "ru": LanguageInfo(nativeName: "Русский", flag: "🇷🇺", isRTL: false),
        "fr": LanguageInfo(nativeName: "Français", flag: "🇫🇷", isRTL: false),
        "de": LanguageInfo(nativeName: "Deutsch", flag: "🇩🇪", isRTL: false),
        "it": LanguageInfo(nativeName: "Italiano", flag: "🇮🇹", isRTL: false),
        "pt": LanguageInfo(nativeName: "Português", flag: "🇵🇹", isRTL: false),
        "yi": LanguageInfo(nativeName: "ייִדיש", flag: "🕍", isRTL: true),
    ]
    return languages[code]
}

private struct LanguageInfo {
    let nativeName: String
    let flag: String
    let isRTL: Bool
}

struct SubtitleSettings {
    var textColor: UIColor = .white
    var backgroundColor: UIColor = UIColor.black.withAlphaComponent(0.6)
    var opacity: Double = 1.0
    var fontSize: SubtitleFontSize = .medium
    var position: SubtitlePosition = .bottom
    var fontFamily: String = "System"
}

enum SubtitleFontSize {
    case small
    case medium
    case large

    var value: CGFloat {
        switch self {
        case .small: return 14
        case .medium: return 17
        case .large: return 20
        }
    }
}

enum SubtitlePosition {
    case top
    case bottom
}
