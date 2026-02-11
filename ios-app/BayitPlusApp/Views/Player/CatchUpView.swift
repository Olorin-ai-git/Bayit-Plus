#if os(iOS)
import BayitDesignSystem
import SwiftUI

/// Scrollable catch-up transcript timeline with seek-to-timestamp.
struct CatchUpView: View {

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
                ProgressView()
                    .tint(DesignTokens.Primary.default)
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
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
            Button { onDismiss() } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .accessibilityLabel("Close catch-up")
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private var content: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(spacing: DesignTokens.Spacing.md) {
                if let summary = viewModel.summary {
                    CatchUpSummaryView(summary: summary)
                }

                ForEach(viewModel.segments) { segment in
                    segmentRow(segment)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
            .padding(.vertical, DesignTokens.Spacing.md)
        }
    }

    private func segmentRow(_ segment: CatchUpSegment) -> some View {
        Button {
            onSeek(segment.timestamp)
        } label: {
            HStack(alignment: .top, spacing: DesignTokens.Spacing.md) {
                Text(formatTimestamp(segment.timestamp))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium, design: .monospaced))
                    .foregroundStyle(DesignTokens.Primary.p300)
                    .frame(width: 60, alignment: .leading)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    if let speaker = segment.speaker {
                        Text(speaker)
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                    Text(segment.text)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(3)
                }

                Spacer()

                Image(systemName: "play.circle")
                    .font(.system(size: 20))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Seek to \(formatTimestamp(segment.timestamp)): \(segment.text)")
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Spacer()
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 36))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(message)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
            GlassButton("Retry", variant: .secondary) {
                Task { await viewModel.loadCatchUp(channelId: channelId) }
            }
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
