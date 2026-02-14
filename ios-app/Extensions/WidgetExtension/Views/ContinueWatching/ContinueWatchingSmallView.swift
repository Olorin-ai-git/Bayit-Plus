import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Small Continue Watching widget: single item thumbnail + progress.
struct ContinueWatchingSmallView: View {
    let entry: ContinueWatchingEntry

    var body: some View {
        if let item = entry.items.first {
            Link(destination: WidgetDeepLinks.content(id: item.contentID, type: item.contentType)) {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    // Thumbnail
                    AsyncImage(url: item.thumbnailURL) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                            .fill(DesignTokens.Glass.bg)
                            .overlay(
                                Image(systemName: "play.rectangle")
                                    .font(.system(size: DesignTokens.FontSize.xxl))
                                    .foregroundStyle(DesignTokens.Text.muted)
                            )
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 80)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                    .accessibilityLabel("Thumbnail for \(item.title)")

                    // Title
                    Text(item.title)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)
                        .accessibilityLabel("Continue watching \(item.title)")

                    // Progress bar
                    progressBar(progress: item.progress)
                        .accessibilityLabel("\(Int(item.progress * 100)) percent complete")
                }
                .padding(DesignTokens.Spacing.md)
                .frame(minWidth: 44, minHeight: 44)
            }
            .accessibilityLabel("Continue watching \(item.title)")
            .accessibilityHint("Opens \(item.title) where you left off")
            .containerBackground(for: .widget) {
                LinearGradient(
                    colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        } else {
            emptyState
        }
    }

    private var emptyState: some View {
        Link(destination: WidgetDeepLinks.home) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "play.rectangle.on.rectangle")
                    .font(.system(size: DesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text("No recent content")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .frame(minWidth: 44, minHeight: 44)
            .padding(DesignTokens.Spacing.md)
        }
        .accessibilityLabel("No recent content")
        .accessibilityHint("Opens home screen to start watching")
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private func progressBar(progress: Double) -> some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Capsule().fill(DesignTokens.Glass.bgMedium)
                Capsule()
                    .fill(DesignTokens.Primary.default)
                    .frame(width: max(0, geometry.size.width * CGFloat(min(max(progress, 0), 1))))
            }
        }
        .frame(height: 3)
    }
}
