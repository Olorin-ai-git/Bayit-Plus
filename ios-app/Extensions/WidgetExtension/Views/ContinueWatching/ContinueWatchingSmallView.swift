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

                    // Title
                    Text(item.title)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    // Progress bar
                    progressBar(progress: item.progress)
                }
                .padding(DesignTokens.Spacing.md)
            }
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
            .padding(DesignTokens.Spacing.md)
        }
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
