#if os(tvOS)
import BayitDesignSystem
import SwiftUI

/// tvOS catch-up replay with transcript timeline and AI summary.
/// Reuses CatchUpViewModel from shared ViewModels.
struct TVCatchUpView: View {

    @State private var viewModel: CatchUpViewModel
    let channelId: String
    let onSeek: (TimeInterval) -> Void
    let onDismiss: () -> Void

    init(repository: any LiveTVRepository, channelId: String,
         onSeek: @escaping (TimeInterval) -> Void,
         onDismiss: @escaping () -> Void) {
        _viewModel = State(initialValue: CatchUpViewModel(repository: repository))
        self.channelId = channelId
        self.onSeek = onSeek
        self.onDismiss = onDismiss
    }

    var body: some View {
        VStack(spacing: 0) {
            header

            if viewModel.isLoading {
                Spacer()
                ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
                Spacer()
            } else if let error = viewModel.error {
                errorView(error)
            } else {
                content
            }
        }
        .background(DesignTokens.Background.primary)
        .task { await viewModel.loadCatchUp(channelId: channelId) }
    }

    private var header: some View {
        HStack {
            Text("Catch Up")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
            GlassButton("Close", variant: .secondary, size: .medium) { onDismiss() }
                .tvFocusStyle()
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private var content: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                if let summary = viewModel.summary {
                    summaryCard(summary)
                }

                ForEach(viewModel.segments) { segment in
                    segmentRow(segment)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }
    }

    private func summaryCard(_ summary: String) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "sparkles")
                    .foregroundStyle(DesignTokens.Primary.p300)
                Text("AI Summary")
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }

            Text(summary)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineSpacing(6)
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.purpleLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    private func segmentRow(_ segment: CatchUpSegment) -> some View {
        Button { onSeek(segment.timestamp) } label: {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Text(formatTimestamp(segment.timestamp))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium, design: .monospaced))
                    .foregroundStyle(DesignTokens.Primary.p300)
                    .frame(width: 80, alignment: .leading)

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    if let speaker = segment.speaker {
                        Text(speaker)
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                    Text(segment.text)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(3)
                }

                Spacer()

                Image(systemName: "play.circle")
                    .font(.system(size: 28))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(
                minWidth: TVDesignTokens.MinSize.focusableWidth,
                minHeight: TVDesignTokens.MinSize.focusableHeight
            )
        }
        .buttonStyle(.card)
        .accessibilityLabel("Seek to \(formatTimestamp(segment.timestamp))")
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
            GlassButton("Retry", variant: .secondary, size: .large) {
                Task { await viewModel.loadCatchUp(channelId: channelId) }
            }
            .tvFocusStyle()
            Spacer()
        }
    }

    private func formatTimestamp(_ seconds: TimeInterval) -> String {
        let mins = Int(seconds) / 60
        let secs = Int(seconds) % 60
        return String(format: "%d:%02d", mins, secs)
    }
}
#endif
