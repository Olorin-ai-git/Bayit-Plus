import BayitDesignSystem
import SwiftUI

/// Emoji flag pill overlay for content cards showing available subtitle languages.
/// Mirrors web's SubtitleFlags.tsx component with AI sparkle indicators.
struct SubtitleFlagsPill: View {
    let languages: [String]
    let aiLanguages: Set<String>
    let size: PillSize

    enum PillSize {
        case small
        case medium
        case large

        var fontSize: CGFloat {
            switch self {
            case .small: return 14
            case .medium: return 16
            case .large: return 22
            }
        }

        var spacing: CGFloat {
            switch self {
            case .small: return 4
            case .medium: return 6
            case .large: return 8
            }
        }

        var padding: CGFloat {
            switch self {
            case .small: return 4
            case .medium: return 6
            case .large: return 8
            }
        }
    }

    private let maxVisibleFlags = 5

    var body: some View {
        HStack(spacing: size.spacing) {
            ForEach(visibleLanguages, id: \.self) { language in
                flagView(for: language)
            }

            if languages.count > maxVisibleFlags {
                overflowView
            }

            if !aiLanguages.isEmpty {
                aiSparkleView
            }
        }
        .padding(.horizontal, size.padding * 1.5)
        .padding(.vertical, size.padding)
        .background(
            Capsule()
                .fill(Color.black.opacity(0.6))
                .overlay(
                    Capsule()
                        .strokeBorder(Color.white.opacity(0.2), lineWidth: 1)
                )
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityText)
    }

    // MARK: - Subviews

    private func flagView(for language: String) -> some View {
        Text(SubtitleLanguages.emojiFlag(for: language))
            .font(.system(size: size.fontSize))
    }

    private var overflowView: some View {
        Text("+\(languages.count - maxVisibleFlags)")
            .font(.system(size: size.fontSize - 2, weight: .medium))
            .foregroundColor(.white.opacity(0.8))
    }

    private var aiSparkleView: some View {
        HStack(spacing: 2) {
            Image(systemName: "sparkles")
                .font(.system(size: size.fontSize - 4))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 2)
        .background(
            Capsule()
                .fill(DesignTokens.Primary.p400)
        )
    }

    // MARK: - Helpers

    private var visibleLanguages: [String] {
        Array(languages.prefix(maxVisibleFlags))
    }

    private var accessibilityText: String {
        var text = "Subtitles available in \(languages.count) languages"
        if !aiLanguages.isEmpty {
            text += " with AI-generated subtitles"
        }
        return text
    }
}
