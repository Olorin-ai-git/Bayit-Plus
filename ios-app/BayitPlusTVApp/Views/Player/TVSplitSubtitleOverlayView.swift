import BayitDesignSystem
import SwiftUI

/// Layout mode for split subtitles on tvOS.
enum SplitSubtitleLayout: String, CaseIterable {
    case stacked // Primary on top, secondary below
    case sideBySide // Left and right columns

    var label: String {
        switch self {
        case .stacked: return "Stacked"
        case .sideBySide: return "Side by Side"
        }
    }

    var icon: String {
        switch self {
        case .stacked: return "text.line.first.and.arrowtriangle.forward"
        case .sideBySide: return "rectangle.split.2x1"
        }
    }
}

/// tvOS split subtitle overlay showing two subtitle languages simultaneously.
/// Supports stacked (primary/secondary) and side-by-side layouts.
struct TVSplitSubtitleOverlayView: View {
    let currentTime: TimeInterval
    let primaryCues: [SubtitleCue]
    let secondaryCues: [SubtitleCue]
    let primaryLanguage: String
    let secondaryLanguage: String
    var layout: SplitSubtitleLayout = .stacked
    var primaryModeLabel: String?
    var secondaryModeLabel: String?

    var body: some View {
        VStack {
            Spacer()

            Group {
                switch layout {
                case .stacked:
                    stackedLayout
                case .sideBySide:
                    sideBySideLayout
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        .containerRelativeFrame(.horizontal) { width, _ in width * 0.8 }
        .padding(.bottom, TVDesignTokens.Spacing.xxxxl)
    }

    // MARK: - Stacked Layout

    private var stackedLayout: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                if let primary = activeCue(from: primaryCues) {
                    subtitleBubble(
                        text: primary.text ?? "",
                        font: TVDesignTokens.FontSize.lg,
                        weight: .medium,
                        color: .white,
                        bgOpacity: 0.75
                    )
                }
                languageLabel(primaryLanguage, modeLabel: primaryModeLabel)
            }

            VStack(spacing: TVDesignTokens.Spacing.xs) {
                if let secondary = activeCue(from: secondaryCues) {
                    subtitleBubble(
                        text: secondary.text ?? "",
                        font: TVDesignTokens.FontSize.md,
                        weight: .regular,
                        color: DesignTokens.Text.secondary,
                        bgOpacity: 0.6
                    )
                }
                languageLabel(secondaryLanguage, modeLabel: secondaryModeLabel)
            }
        }
    }

    // MARK: - Side by Side Layout

    private var sideBySideLayout: some View {
        HStack(alignment: .bottom, spacing: TVDesignTokens.Spacing.sm) {
            // Primary language (left)
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                if let primary = activeCue(from: primaryCues) {
                    subtitleBubbleWithBorder(
                        text: primary.text ?? "",
                        font: TVDesignTokens.FontSize.md,
                        weight: .semibold,
                        color: .white,
                        bgOpacity: 0.9,
                        borderEdge: .leading,
                        borderColor: Color(hex: "#3b82f6")
                    )
                }
                languageLabel(primaryLanguage, modeLabel: primaryModeLabel)
            }
            .frame(maxWidth: .infinity)

            // Divider
            Rectangle()
                .fill(Color.white.opacity(0.25))
                .frame(width: 2)
                .frame(maxHeight: 60)
                .cornerRadius(1)

            // Secondary language (right)
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                if let secondary = activeCue(from: secondaryCues) {
                    subtitleBubbleWithBorder(
                        text: secondary.text ?? "",
                        font: TVDesignTokens.FontSize.md,
                        weight: .semibold,
                        color: .white,
                        bgOpacity: 0.9,
                        borderEdge: .trailing,
                        borderColor: Color(hex: "#8b5cf6")
                    )
                }
                languageLabel(secondaryLanguage, modeLabel: secondaryModeLabel)
            }
            .frame(maxWidth: .infinity)
        }
    }
}
