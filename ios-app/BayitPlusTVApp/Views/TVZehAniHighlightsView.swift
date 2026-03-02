#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Highlight Reels View

    struct TVHighlightsView: View {
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(LocalizationManager.self) var localization

        let profileId: String

        @State var reels: [HighlightReelItem] = []
        @State var isLoading = false
        @State var isGenerating = false
        @State var isSending = false
        @State var error: String?
        @State var sentConfirmation: String?
        @FocusState var generateButtonFocused: Bool

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: 0) {
                    headerSection

                    if let error = error {
                        errorDisplay(error)
                    }

                    if isGenerating {
                        generatingFeedback
                    }

                    if let confirmation = sentConfirmation {
                        confirmationBanner(confirmation)
                    }

                    if isLoading {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(1.5)
                            .frame(maxHeight: .infinity)
                    } else if reels.isEmpty {
                        emptyState
                    } else {
                        reelsList
                    }
                }
            }
            .task { await loadReels() }
        }

        private var headerSection: some View {
            HStack {
                Text(localization.t("zehAni.highlights.title"))
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Button {
                    Task { await generateReel() }
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "plus.circle.fill")
                        Text(localization.t("zehAni.highlights.generate"))
                    }
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                }
                .tvCardStyle()
                .focused($generateButtonFocused)
                .disabled(isGenerating)
                .opacity(isGenerating ? 0.5 : 1.0)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }

        private func confirmationBanner(_ confirmation: String) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(DesignTokens.Success.default)
                Text(confirmation)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Success.default.opacity(0.12))
            .cornerRadius(TVDesignTokens.Radius.md)
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .transition(.opacity)
        }

        private func errorDisplay(_ message: String) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.ErrorColor.default.opacity(0.1))
            .cornerRadius(TVDesignTokens.Radius.md)
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        }

        private var generatingFeedback: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                Text(localization.t("zehAni.highlights.generating"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Primary.default.opacity(0.1))
            .cornerRadius(TVDesignTokens.Radius.md)
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        }

        private var emptyState: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Image(systemName: "film.stack")
                    .font(.system(size: 120))
                    .foregroundStyle(DesignTokens.Text.muted)

                Text(localization.t("zehAni.highlights.empty"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxHeight: .infinity)
        }

        private var reelsList: some View {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: TVDesignTokens.Spacing.lg) {
                    ForEach(reels) { reel in
                        TVHighlightReelCard(
                            reel: reel,
                            isSending: isSending,
                            onShare: { shareReel(reel) },
                            localization: localization
                        )
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.vertical, TVDesignTokens.Spacing.xl)
            }
        }
    }

#endif
