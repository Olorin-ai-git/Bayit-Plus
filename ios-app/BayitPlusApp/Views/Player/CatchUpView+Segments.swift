#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Extension providing segment row and timestamp formatting for CatchUpView.
    extension CatchUpView {
        func segmentRow(_ segment: CatchUpSegment) -> some View {
            Button {
                onSeek(segment.timestamp)
            } label: {
                HStack(alignment: .top, spacing: DesignTokens.Spacing.md) {
                    Text(formatTimestamp(segment.timestamp))
                        .font(.system(
                            size: DesignTokens.FontSize.sm,
                            weight: .medium,
                            design: .monospaced
                        ))
                        .foregroundStyle(DesignTokens.Primary.p300)
                        .frame(width: 60, alignment: .leading)

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        if let speaker = segment.speaker {
                            Text(speaker)
                                .font(.system(
                                    size: DesignTokens.FontSize.sm,
                                    weight: .semibold
                                ))
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
            .accessibilityLabel(
                "Seek to \(formatTimestamp(segment.timestamp)): \(segment.text)"
            )
        }

        func formatTimestamp(_ seconds: TimeInterval) -> String {
            let mins = Int(seconds) / 60
            let secs = Int(seconds) % 60
            return String(format: "%d:%02d", mins, secs)
        }
    }
#endif
