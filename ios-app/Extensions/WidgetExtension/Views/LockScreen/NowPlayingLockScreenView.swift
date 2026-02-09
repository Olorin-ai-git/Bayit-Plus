import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

// MARK: - Inline

/// Lock Screen inline: "Channel - Show Title"
struct NowPlayingLockScreenInlineView: View {
    let entry: NowPlayingEntry

    var body: some View {
        if let data = entry.nowPlaying {
            Label {
                Text("\(data.channelName) - \(data.showTitle)")
            } icon: {
                Image(systemName: data.isPlaying ? "play.fill" : "pause.fill")
            }
        } else {
            Label("Bayit+", systemImage: "tv")
        }
    }
}

// MARK: - Circular

/// Lock Screen circular: play icon with progress ring.
struct NowPlayingLockScreenCircularView: View {
    let entry: NowPlayingEntry

    var body: some View {
        if let data = entry.nowPlaying {
            ZStack {
                // Progress ring
                AccessoryWidgetBackground()
                ProgressView(value: min(max(data.progress, 0), 1))
                    .progressViewStyle(.circular)
                    .tint(DesignTokens.Primary.default)

                Image(systemName: data.isPlaying ? "play.fill" : "pause.fill")
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .widgetAccentable()
            }
        } else {
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "tv")
                    .font(.system(size: DesignTokens.FontSize.lg))
            }
        }
    }
}

// MARK: - Rectangular

/// Lock Screen rectangular: channel + show + progress bar.
struct NowPlayingLockScreenRectangularView: View {
    let entry: NowPlayingEntry

    var body: some View {
        if let data = entry.nowPlaying {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: data.isPlaying ? "play.fill" : "pause.fill")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .widgetAccentable()
                    Text(data.channelName)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                        .lineLimit(1)
                }

                Text(data.showTitle)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .lineLimit(1)
                    .foregroundStyle(.secondary)

                // Progress bar
                ProgressView(value: min(max(data.progress, 0), 1))
                    .tint(DesignTokens.Primary.default)
            }
        } else {
            VStack(alignment: .leading, spacing: 2) {
                Text("Bayit+")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                Text("Nothing playing")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(.secondary)
            }
        }
    }
}
