#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS Bilingual Bridge dubbing overlay. Designed for 10-foot viewing distance
    /// with large text, focus-friendly toggle, level indicator, ratio display,
    /// and vocabulary count. Uses TVDesignTokens for spacing and sizing.
    struct TVBilingualDubbingOverlayView: View {
        @Environment(LocalizationManager.self) private var localization
        @Environment(\.dismiss) private var dismiss
        @Bindable var viewModel: BilingualDubbingViewModel
        let contentId: String
        let profileId: String

        var body: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                if viewModel.proficiency != nil {
                    controlsContent
                } else if viewModel.isLoading {
                    loadingState
                }
            }
            .onExitCommand { dismiss() }
            .task {
                await viewModel.fetchProficiency(profileId: profileId)
            }
        }

        // MARK: - Loading

        private var loadingState: some View {
            GlassCard(
                radius: TVDesignTokens.Radius.lg,
                padding: TVDesignTokens.Spacing.lg
            ) {
                ProgressView()
                    .tint(DesignTokens.Text.secondary)
                    .frame(maxWidth: .infinity, minHeight: TVDesignTokens.MinSize.focusableHeight)
            }
        }

        // MARK: - Controls

        private var controlsContent: some View {
            VStack(spacing: TVDesignTokens.Spacing.focusGap) {
                dubbingToggle
                ratioDisplay
                statusRow
            }
            .padding(TVDesignTokens.Spacing.lg)
        }

        // MARK: - Toggle

        private var dubbingToggle: some View {
            GlassButton(
                viewModel.isActive
                    ? localization.t("bilingualBridge.on")
                    : localization.t("bilingualBridge.off"),
                variant: viewModel.isActive ? .primary : .secondary,
                size: .medium,
                icon: Image(systemName: viewModel.isActive
                    ? "textformat.abc.dottedunderline"
                    : "textformat.abc")
            ) {
                Task {
                    if viewModel.isActive {
                        await viewModel.endSession()
                    } else {
                        await viewModel.startSession(
                            contentId: contentId,
                            profileId: profileId
                        )
                    }
                }
            }
            .accessibilityLabel(localization.t("bilingualBridge.accessibilityLabel"))
            .accessibilityValue(
                viewModel.isActive
                    ? localization.t("bilingualBridge.accessibilityEnabled")
                    : localization.t("bilingualBridge.accessibilityDisabled")
            )
            .accessibilityHint(localization.t("bilingualBridge.accessibilityHint"))
        }

        // MARK: - Ratio Display

        @ViewBuilder
        private var ratioDisplay: some View {
            let ratio = viewModel.activeSession?.actualHebrewRatio
                ?? viewModel.proficiency?.hebrewRatio ?? 0
            let hebrewPercent = Int(round(min(max(ratio, 0), 1) * 100))
            let englishPercent = 100 - hebrewPercent

            GlassCard(
                radius: TVDesignTokens.Radius.lg,
                padding: TVDesignTokens.Spacing.lg
            ) {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    Text(localization.t("bilingualBridge.languageRatio"))
                        .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    GeometryReader { geometry in
                        let width = geometry.size.width
                        let hebrewWidth = max(0, width * CGFloat(ratio))

                        ZStack(alignment: .leading) {
                            Capsule()
                                .fill(Color.white.opacity(0.15))
                            Capsule()
                                .fill(DesignTokens.Info.default)
                                .frame(width: hebrewWidth)
                        }
                    }
                    .frame(height: 12)
                    .clipShape(Capsule())

                    HStack {
                        Text("\(localization.t("languages.hebrew")) \(hebrewPercent)%")
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                            .foregroundStyle(DesignTokens.Info.i400)
                        Spacer()
                        Text("\(localization.t("languages.english")) \(englishPercent)%")
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Hebrew \(hebrewPercent) percent, English \(englishPercent) percent")
        }

        // MARK: - Status Row

        @ViewBuilder
        private var statusRow: some View {
            if let proficiency = viewModel.proficiency {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    // Level badge
                    GlassBadge(
                        text: proficiency.level,
                        variant: levelVariant(proficiency.level)
                    )
                    .accessibilityLabel("Level: \(proficiency.level)")

                    // Vocabulary count
                    GlassCard(
                        radius: TVDesignTokens.Radius.md,
                        padding: TVDesignTokens.Spacing.md
                    ) {
                        HStack(spacing: TVDesignTokens.Spacing.sm) {
                            Text("\(proficiency.totalWordsLearned)")
                                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                                .foregroundStyle(DesignTokens.Text.primary)
                            Text(localization.t("bilingualBridge.wordsLearned"))
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                    }
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("\(proficiency.totalWordsLearned) words learned")

                    // Session indicator
                    if viewModel.isActive {
                        GlassBadge(
                            text: localization.t("bilingualBridge.active"),
                            variant: .success
                        )
                        .accessibilityLabel(localization.t("bilingual.sessionActive"))
                    }
                }
            }
        }

        // MARK: - Helpers

        private func levelVariant(_ level: String) -> GlassBadge.Variant {
            switch level {
            case "beginner": return .primary
            case "elementary": return .info
            case "intermediate": return .warning
            case "advanced": return .success
            default: return .primary
            }
        }
    }
#endif
