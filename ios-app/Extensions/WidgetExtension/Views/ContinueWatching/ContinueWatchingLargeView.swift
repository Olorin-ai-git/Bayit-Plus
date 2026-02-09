import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Large Continue Watching widget: 4-6 items in a grid layout.
struct ContinueWatchingLargeView: View {
    let entry: ContinueWatchingEntry

    private var displayItems: [SharedContinueWatchingItem] {
        Array(entry.items.prefix(6))
    }

    private let columns = [
        GridItem(.flexible(), spacing: 8),
        GridItem(.flexible(), spacing: 8),
        GridItem(.flexible(), spacing: 8),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            // Header
            HStack {
                Text("Continue Watching")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                Link(destination: WidgetDeepLinks.home) {
                    Text("See All")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
            }

            if displayItems.isEmpty {
                Spacer()
                emptyState
                Spacer()
            } else {
                LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.sm) {
                    ForEach(displayItems) { item in
                        Link(destination: WidgetDeepLinks.content(
                            id: item.contentID,
                            type: item.contentType
                        )) {
                            itemCell(item)
                        }
                    }
                }
            }
        }
        .padding(DesignTokens.Spacing.base)
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private func itemCell(_ item: SharedContinueWatchingItem) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            // Thumbnail with progress overlay
            ZStack(alignment: .bottomLeading) {
                AsyncImage(url: item.thumbnailURL) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(DesignTokens.Glass.bg)
                        .overlay(
                            Image(systemName: "play.rectangle")
                                .foregroundStyle(DesignTokens.Text.muted)
                        )
                }
                .frame(height: 70)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

                // Play overlay
                Image(systemName: "play.fill")
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundStyle(.white)
                    .padding(DesignTokens.Spacing.xs)
                    .background(Circle().fill(Color.black.opacity(0.6)))
                    .padding(DesignTokens.Spacing.xs)

                // Progress bar at bottom
                GeometryReader { geo in
                    VStack {
                        Spacer()
                        Capsule()
                            .fill(DesignTokens.Primary.default)
                            .frame(
                                width: max(0, geo.size.width * CGFloat(min(max(item.progress, 0), 1))),
                                height: 2
                            )
                    }
                }
            }

            // Title
            Text(item.title)
                .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(2)

            // Duration remaining
            Text(remainingText(item))
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
                .lineLimit(1)
        }
    }

    private func remainingText(_ item: SharedContinueWatchingItem) -> String {
        let remaining = Int(Double(item.durationSeconds) * (1.0 - item.progress))
        let minutes = remaining / 60
        if minutes > 60 {
            return "\(minutes / 60)h \(minutes % 60)m left"
        }
        return "\(minutes)m left"
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "play.rectangle.on.rectangle")
                .font(.system(size: DesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Text.muted)
            Text("No recent content")
                .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)
            Text("Start watching to see items here")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity)
    }
}
