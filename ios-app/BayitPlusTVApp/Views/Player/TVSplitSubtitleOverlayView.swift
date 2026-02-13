import BayitDesignSystem
import SwiftUI

/// Layout mode for split subtitles on tvOS.
enum SplitSubtitleLayout: String, CaseIterable {
    case stacked    // Primary on top, secondary below
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
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.bottom, TVDesignTokens.Spacing.xxxxl)
        }
    }

    // MARK: - Stacked Layout

    private var stackedLayout: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            if let primary = activeCue(from: primaryCues) {
                subtitleBubble(
                    text: primary.text ?? "",
                    font: TVDesignTokens.FontSize.lg,
                    weight: .medium,
                    color: .white,
                    bgOpacity: 0.75
                )
            }

            if let secondary = activeCue(from: secondaryCues) {
                subtitleBubble(
                    text: secondary.text ?? "",
                    font: TVDesignTokens.FontSize.md,
                    weight: .regular,
                    color: DesignTokens.Text.secondary,
                    bgOpacity: 0.6
                )
            }
        }
    }

    // MARK: - Side by Side Layout

    private var sideBySideLayout: some View {
        HStack(alignment: .bottom, spacing: TVDesignTokens.Spacing.sm) {
            // Primary language (left)
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                if let primary = activeCue(from: primaryCues) {
                    languageLabel(primaryLanguage)
                    subtitleBubbleWithBorder(
                        text: primary.text ?? "",
                        font: TVDesignTokens.FontSize.lg,
                        weight: .medium,
                        color: .white,
                        bgOpacity: 0.75,
                        borderEdge: .leading,
                        borderColor: Color(hex: "#3b82f6")
                    )
                }
            }
            .frame(maxWidth: .infinity)

            // Divider
            Rectangle()
                .fill(Color.white.opacity(0.25))
                .frame(width: 2)
                .cornerRadius(1)

            // Secondary language (right)
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                if let secondary = activeCue(from: secondaryCues) {
                    languageLabel(secondaryLanguage)
                    subtitleBubbleWithBorder(
                        text: secondary.text ?? "",
                        font: TVDesignTokens.FontSize.lg,
                        weight: .medium,
                        color: DesignTokens.Text.secondary,
                        bgOpacity: 0.6,
                        borderEdge: .trailing,
                        borderColor: Color(hex: "#8b5cf6")
                    )
                }
            }
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Shared Components

    private func subtitleBubble(
        text: String,
        font: CGFloat,
        weight: Font.Weight,
        color: Color,
        bgOpacity: Double
    ) -> some View {
        Text(text)
            .font(.system(size: font, weight: weight))
            .foregroundStyle(color)
            .multilineTextAlignment(.center)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(.black.opacity(bgOpacity))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
    }

    private func subtitleBubbleWithBorder(
        text: String,
        font: CGFloat,
        weight: Font.Weight,
        color: Color,
        bgOpacity: Double,
        borderEdge: Edge,
        borderColor: Color
    ) -> some View {
        Text(text)
            .font(.system(size: font, weight: weight))
            .foregroundStyle(color)
            .multilineTextAlignment(.center)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(.black.opacity(bgOpacity))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
            .overlay(alignment: borderEdge.alignment) {
                Rectangle()
                    .fill(borderColor)
                    .frame(
                        width: borderEdge == .leading || borderEdge == .trailing ? 3 : nil,
                        height: borderEdge == .top || borderEdge == .bottom ? 3 : nil
                    )
            }
    }

    private func languageLabel(_ code: String) -> some View {
        let info = SubtitleLanguages.info(for: code)
        return Text(info?.nativeName ?? code)
            .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
            .foregroundStyle(DesignTokens.Primary.p400)
    }

    private func activeCue(from cues: [SubtitleCue]) -> SubtitleCue? {
        cues.first {
            guard let start = $0.startTime, let end = $0.endTime else { return false }
            return currentTime >= start && currentTime <= end
        }
    }
}

// MARK: - Edge Helpers

private extension Edge {
    var alignment: Alignment {
        switch self {
        case .top: return .top
        case .leading: return .leading
        case .bottom: return .bottom
        case .trailing: return .trailing
        }
    }
}

// MARK: - Color Hex Extension

private extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
