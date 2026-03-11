import BayitDesignSystem
import SwiftUI

/// tvOS AI features control bar for live content.
/// Provides buttons for live translation, dubbing, trivia, catch-up,
/// split subtitles, and language selection.
/// Uses focusable card buttons for Siri Remote navigation.
struct TVAIFeaturesPanel: View {
    let isSubtitlesEnabled: Bool
    let isDubbingEnabled: Bool
    let isTriviaEnabled: Bool
    let isCatchUpAvailable: Bool
    let isSceneSearchActive: Bool
    let currentLanguage: String

    let onSubtitlesTap: () -> Void
    let onDubbingTap: () -> Void
    let onTriviaTap: () -> Void
    let onCatchUpTap: (() -> Void)?
    let onSceneSearchTap: () -> Void
    let onLanguageTap: () -> Void

    init(
        isSubtitlesEnabled: Bool,
        isDubbingEnabled: Bool,
        isTriviaEnabled: Bool,
        isCatchUpAvailable: Bool = false,
        isSceneSearchActive: Bool = false,
        currentLanguage: String,
        onSubtitlesTap: @escaping () -> Void,
        onDubbingTap: @escaping () -> Void,
        onTriviaTap: @escaping () -> Void,
        onCatchUpTap: (() -> Void)? = nil,
        onSceneSearchTap: @escaping () -> Void,
        onLanguageTap: @escaping () -> Void
    ) {
        self.isSubtitlesEnabled = isSubtitlesEnabled
        self.isDubbingEnabled = isDubbingEnabled
        self.isTriviaEnabled = isTriviaEnabled
        self.isCatchUpAvailable = isCatchUpAvailable
        self.isSceneSearchActive = isSceneSearchActive
        self.currentLanguage = currentLanguage
        self.onSubtitlesTap = onSubtitlesTap
        self.onDubbingTap = onDubbingTap
        self.onTriviaTap = onTriviaTap
        self.onCatchUpTap = onCatchUpTap
        self.onSceneSearchTap = onSceneSearchTap
        self.onLanguageTap = onLanguageTap
    }

    var body: some View {
        VStack {
            Spacer()
            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                languageBadge

                featureButton(
                    icon: "captions.bubble",
                    label: "Translate",
                    isActive: isSubtitlesEnabled,
                    action: onSubtitlesTap
                )

                featureButton(
                    icon: "waveform",
                    label: "Dubbing",
                    isActive: isDubbingEnabled,
                    action: onDubbingTap
                )

                featureButton(
                    icon: "lightbulb",
                    label: "Trivia",
                    isActive: isTriviaEnabled,
                    action: onTriviaTap
                )

                if let onCatchUpTap, isCatchUpAvailable {
                    featureButton(
                        icon: "clock.arrow.circlepath",
                        label: "Catch Up",
                        isActive: false,
                        action: onCatchUpTap
                    )
                }

                featureButton(
                    icon: "magnifyingglass",
                    label: "Scene Search",
                    isActive: isSceneSearchActive,
                    action: onSceneSearchTap
                )
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgStrong)
            .cornerRadius(TVDesignTokens.Radius.lg)
        }
        .padding(.bottom, TVDesignTokens.Spacing.xl)
        .transition(.move(edge: .bottom).combined(with: .opacity))
        .focusSection()
    }

    private var languageBadge: some View {
        Button(action: onLanguageTap) {
            Text(currentLanguage.uppercased())
                .font(.system(
                    size: TVDesignTokens.FontSize.sm, weight: .bold
                ))
                .foregroundStyle(.white)
                .frame(width: 48, height: 36)
                .background(DesignTokens.Primary.p700)
                .clipShape(RoundedRectangle(
                    cornerRadius: TVDesignTokens.Radius.sm
                ))
        }
        .buttonStyle(AIFeatureCardStyle())
        .focusEffectDisabled()
        .accessibilityLabel("Change AI language: \(currentLanguage)")
    }

    private func featureButton(
        icon: String,
        label: String,
        isActive: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: isActive ? "\(icon).fill" : icon)
                    .font(.system(size: 24))
                Text(label)
                    .font(.system(size: TVDesignTokens.FontSize.xs))
            }
            .foregroundStyle(
                isActive
                    ? DesignTokens.Primary.p400
                    : DesignTokens.Text.primary
            )
            .frame(
                minWidth: TVDesignTokens.MinSize.focusableWidth,
                minHeight: TVDesignTokens.MinSize.focusableHeight
            )
        }
        .buttonStyle(AIFeatureCardStyle())
        .focusEffectDisabled()
        .accessibilityLabel("\(label): \(isActive ? "On" : "Off")")
    }
}
