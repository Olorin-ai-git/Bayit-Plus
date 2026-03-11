#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Horizontal scrollable panel displaying AI feature controls for live content
    /// with a language badge, sparkles toggle, and feature buttons.
    struct GlassAIFeaturesPanel: View {
        @Environment(LocalizationManager.self) var localization

        let isExpanded: Bool
        let onToggleExpand: () -> Void
        let currentLanguageCode: String
        let splitLanguages: [String]
        let isLiveContent: Bool
        let isSplitLanguagesReady: Bool
        let onLanguageBadgeTap: () -> Void
        let isSubtitlesEnabled: Bool
        let isSubtitlesConnecting: Bool
        let isSubtitlesPremiumLocked: Bool
        let isSplitEnabled: Bool
        let isDubbingEnabled: Bool
        let isDubbingConnecting: Bool
        let isDubbingPremiumLocked: Bool
        let isTriviaEnabled: Bool
        let isTriviaConnecting: Bool
        let onSubtitlesTap: () -> Void
        let onSplitSubtitlesTap: () -> Void
        let onDubbingTap: () -> Void
        let onTriviaTap: () -> Void

        private let panelHeight: CGFloat = UIDevice.current.userInterfaceIdiom == .pad ? 56 : 48

        var body: some View {
            HStack(spacing: 0) {
                expandToggle
                if isExpanded {
                    panelDivider
                    scrollableControls
                }
            }
            .frame(height: panelHeight)
            .background(panelBackground)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .stroke(DesignTokens.Primary.p800.opacity(0.4), lineWidth: 1)
            )
            .padding(.horizontal, DesignTokens.Spacing.base)
            .animation(.spring(duration: 0.3), value: isExpanded)
        }

        // MARK: - Expand Toggle

        private var expandToggle: some View {
            HStack(spacing: 0) {
                languageBadge
                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    onToggleExpand()
                } label: {
                    Image(systemName: "sparkles")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(
                            isExpanded ? DesignTokens.Primary.p400 : DesignTokens.Text.primary
                        )
                        .frame(width: 44, height: panelHeight)
                }
                .accessibilityLabel(
                    isExpanded
                        ? localization.t("player.hideAIFeatures")
                        : localization.t("player.showAIFeatures")
                )
                if isExpanded {
                    languageChevron
                }
            }
        }

        private var languageChevron: some View {
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                onLanguageBadgeTap()
            } label: {
                Image(systemName: "chevron.down")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 24, height: panelHeight)
            }
            .accessibilityLabel(localization.t("player.selectOutputLanguage"))
        }

        private var languageBadge: some View {
            Button {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                onLanguageBadgeTap()
            } label: {
                if isSplitEnabled, splitLanguages.count == 2 {
                    HStack(spacing: 1) {
                        Text(SubtitleLanguages.emojiFlag(for: splitLanguages[0]))
                            .font(.system(size: 13))
                        Text(SubtitleLanguages.emojiFlag(for: splitLanguages[1]))
                            .font(.system(size: 13))
                    }
                    .padding(.horizontal, 4)
                    .frame(height: 28)
                    .background(DesignTokens.Primary.p800.opacity(0.3))
                    .clipShape(Capsule())
                } else {
                    Text(SubtitleLanguages.emojiFlag(for: currentLanguageCode))
                        .font(.system(size: 16))
                        .frame(width: 28, height: 28)
                        .background(DesignTokens.Primary.p800.opacity(0.3))
                        .clipShape(Circle())
                }
            }
            .padding(.leading, DesignTokens.Spacing.sm)
            .accessibilityLabel(splitLanguageBadgeAccessibilityLabel)
        }

        private var splitLanguageBadgeAccessibilityLabel: String {
            if isSplitEnabled, splitLanguages.count == 2 {
                let name0 = SubtitleLanguages.info(for: splitLanguages[0])?.name ?? splitLanguages[0]
                let name1 = SubtitleLanguages.info(for: splitLanguages[1])?.name ?? splitLanguages[1]
                return localization.t("player.currentLanguage") + ": \(name0) + \(name1)"
            }
            return localization.t("player.currentLanguage") + ": "
                + (SubtitleLanguages.info(for: currentLanguageCode)?.name ?? currentLanguageCode)
        }

        private var panelDivider: some View {
            Rectangle()
                .fill(DesignTokens.Glass.border)
                .frame(width: 1, height: panelHeight - 16)
        }

        private var scrollableControls: some View {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    liveTranslateButton
                    splitSubtitlesButton
                    liveDubbingButton
                    liveTriviaButton
                }
                .padding(.horizontal, DesignTokens.Spacing.sm)
            }
        }
    }
#endif
