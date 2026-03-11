#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Scrollable catch-up view combining AI summary and transcript timeline.
    /// Accepts a shared `CatchUpViewModel` from the parent PlayerView.
    struct CatchUpView: View {
        @Environment(LocalizationManager.self) private var localization

        @Bindable var viewModel: CatchUpViewModel
        let channelId: String
        let targetLanguage: String
        let creditBalance: Int
        let onSeek: (TimeInterval) -> Void
        let onDismiss: () -> Void
        let onUpgrade: () -> Void

        var body: some View {
            VStack(spacing: 0) {
                header

                if viewModel.isLoading {
                    Spacer()
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                    Spacer()
                } else if viewModel.errorType == .insufficientCredits {
                    insufficientCreditsView
                } else if let error = viewModel.error {
                    errorView(error)
                } else {
                    content
                }
            }
            .background(DesignTokens.Background.primary)
            .task {
                await viewModel.loadCatchUp(
                    channelId: channelId,
                    targetLanguage: targetLanguage
                )
            }
        }

        // MARK: - Header

        private var header: some View {
            HStack {
                Text(localization.t("catchup.button.title"))
                    .font(.system(
                        size: DesignTokens.FontSize.lg, weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                if creditBalance > 0 {
                    GlassBadge(
                        text: "\(creditBalance)",
                        variant: .primary
                    )
                }

                Button { onDismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                .accessibilityLabel(localization.t("catchup.summary.close"))
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
            .padding(.vertical, DesignTokens.Spacing.md)
        }

        // MARK: - Content

        private var content: some View {
            ScrollView(.vertical, showsIndicators: true) {
                VStack(spacing: DesignTokens.Spacing.md) {
                    if let summaryResponse = viewModel.summary {
                        CatchUpSummaryView(
                            response: summaryResponse,
                            onClose: { viewModel.closeSummary() }
                        )
                    } else if let legacy = viewModel.legacySummary {
                        legacySummaryCard(legacy)
                    }

                    ForEach(viewModel.segments) { segment in
                        segmentRow(segment)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.md)
            }
        }

        // MARK: - Legacy Summary (fallback)

        private func isTextRTL(_ text: String) -> Bool {
            guard let first = text.unicodeScalars.first else { return false }
            let value = first.value
            return (value >= 0x0590 && value <= 0x05FF)
                || (value >= 0x0600 && value <= 0x06FF)
        }

        private func legacySummaryCard(_ summary: String) -> some View {
            let rtl = isTextRTL(summary)
            return VStack(
                alignment: rtl ? .trailing : .leading,
                spacing: DesignTokens.Spacing.sm
            ) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: "sparkles")
                        .foregroundStyle(DesignTokens.Primary.p300)
                    Text(localization.t("catchup.summary.title"))
                        .font(.system(
                            size: DesignTokens.FontSize.sm, weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Primary.p300)
                }

                Text(summary)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineSpacing(6)
                    .multilineTextAlignment(rtl ? .trailing : .leading)
                    .frame(
                        maxWidth: .infinity,
                        alignment: rtl ? .trailing : .leading
                    )
            }
            .padding(DesignTokens.Spacing.base)
            .background(DesignTokens.Glass.purpleLight)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        }

        // MARK: - Insufficient Credits

        private var insufficientCreditsView: some View {
            VStack(spacing: DesignTokens.Spacing.lg) {
                Spacer()
                InsufficientCreditsModalView(
                    requiredCredits: 1,
                    currentBalance: creditBalance,
                    onUpgrade: onUpgrade,
                    onDismiss: onDismiss
                )
                Spacer()
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
        }

        // MARK: - Error

        private func errorView(_ message: String) -> some View {
            VStack(spacing: DesignTokens.Spacing.md) {
                Spacer()
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 36))
                    .foregroundStyle(DesignTokens.Warning.default)
                Text(message)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                GlassButton(
                    localization.t("catchup.error.retry"),
                    variant: .secondary
                ) {
                    Task {
                        await viewModel.loadCatchUp(
                            channelId: channelId,
                            targetLanguage: targetLanguage
                        )
                    }
                }
                Spacer()
            }
        }
    }
#endif
