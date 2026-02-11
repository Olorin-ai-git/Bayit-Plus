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
        HStack(alignment: .bottom, spacing: TVDesignTokens.Spacing.xxl) {
            // Primary language (left)
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                if let primary = activeCue(from: primaryCues) {
                    languageLabel(primaryLanguage)
                    subtitleBubble(
                        text: primary.text ?? "",
                        font: TVDesignTokens.FontSize.lg,
                        weight: .medium,
                        color: .white,
                        bgOpacity: 0.75
                    )
                }
            }
            .frame(maxWidth: .infinity)

            // Secondary language (right)
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                if let secondary = activeCue(from: secondaryCues) {
                    languageLabel(secondaryLanguage)
                    subtitleBubble(
                        text: secondary.text ?? "",
                        font: TVDesignTokens.FontSize.lg,
                        weight: .medium,
                        color: DesignTokens.Text.secondary,
                        bgOpacity: 0.6
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
