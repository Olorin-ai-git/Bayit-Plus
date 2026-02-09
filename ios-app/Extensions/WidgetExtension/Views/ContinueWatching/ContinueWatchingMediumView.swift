import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Medium Continue Watching widget: 2-3 items in a horizontal row.
struct ContinueWatchingMediumView: View {
    let entry: ContinueWatchingEntry

    private var displayItems: [SharedContinueWatchingItem] {
        Array(entry.items.prefix(3))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            // Header
            HStack {
                Text("Continue Watching")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            if displayItems.isEmpty {
                emptyRow
            } else {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(displayItems) { item in
                        Link(destination: WidgetDeepLinks.content(id: item.contentID, type: item.contentType)) {
                            itemCard(item)
                        }
                    }
                }
            }
        }
        .padding(DesignTokens.Spacing.md)
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private func itemCard(_ item: SharedContinueWatchingItem) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            // Thumbnail
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
                .frame(maxWidth: .infinity)
                .frame(height: 60)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

                // Progress overlay at bottom
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
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }

    private var emptyRow: some View {
        HStack {
            Spacer()
            Text("Start watching to see items here")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
            Spacer()
        }
        .frame(maxHeight: .infinity)
    }
}
