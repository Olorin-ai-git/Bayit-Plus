#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS catch-up view with AI summary, key points, credit usage,
    /// and transcript timeline. Accepts shared CatchUpViewModel from parent.
    struct TVCatchUpView: View {
        @Environment(LocalizationManager.self) var localization

        @Bindable var viewModel: CatchUpViewModel
        let channelId: String
        let onSeek: (TimeInterval) -> Void
        let onDismiss: () -> Void

        var body: some View {
            VStack(spacing: 0) {
                header

                if viewModel.isLoading {
                    Spacer()
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                        .scaleEffect(1.5)
                    Spacer()
                } else if viewModel.errorType == .insufficientCredits {
                    insufficientCreditsView
                } else if viewModel.errorType == .serviceUnavailable {
                    serviceUnavailableView
                } else if let error = viewModel.error {
                    errorView(error)
                } else {
                    content
                }
            }
            .background(DesignTokens.Background.primary)
            .task { await viewModel.loadCatchUp(channelId: channelId) }
        }

        // MARK: - Header

        private var header: some View {
            HStack {
                Text(localization.t("catchup.button.title"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.xxl, weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                if viewModel.creditBalance > 0 {
                    Text("\(viewModel.creditBalance)")
                        .font(.system(
                            size: TVDesignTokens.FontSize.sm, weight: .bold
                        ))
                        .foregroundStyle(DesignTokens.Primary.p300)
                        .padding(.horizontal, TVDesignTokens.Spacing.md)
                        .padding(.vertical, TVDesignTokens.Spacing.xs)
                        .background(DesignTokens.Glass.bgLight)
                        .clipShape(RoundedRectangle(
                            cornerRadius: TVDesignTokens.Radius.sm
                        ))
                }

                GlassButton(
                    localization.t("catchup.summary.close"),
                    variant: .secondary,
                    size: .medium
                ) {
                    onDismiss()
                }
                .tvFocusStyle()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }

        // MARK: - Content

        private var content: some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    if let summaryResponse = viewModel.summary {
                        enhancedSummaryCard(summaryResponse)
                    } else if let legacy = viewModel.legacySummary {
                        legacySummaryCard(legacy)
                    }

                    ForEach(viewModel.segments) { segment in
                        segmentRow(segment)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
            }
        }
    }
#endif
