import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Large Continue Watching widget: header + See All + 6 items in 3-column grid with resume.
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
                    .accessibilityAddTraits(.isHeader)
                Spacer()
                Link(destination: WidgetDeepLinks.home) {
                    Text("See All")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
                .frame(minWidth: 44, minHeight: 44)
                .accessibilityLabel("See all content")
                .accessibilityHint("Opens home screen")
            }

            if displayItems.isEmpty {
                Spacer()
                emptyState
                Spacer()
            } else {
                LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.sm) {
                    ForEach(displayItems) { item in
                        Link(destination: WidgetDeepLinks.resume(
                            id: item.contentID,
                            type: item.contentType
                        )) {
                            itemCell(item)
                        }
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityLabel("Resume \(item.title)")
                        .accessibilityHint("Resumes \(item.title) where you left off")
                        .accessibilityValue(ContinueWatchingWidgetHelpers.remainingText(
                            progress: item.progress,
                            durationSeconds: item.durationSeconds
                        ))
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
            // Thumbnail with play overlay + progress overlay
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
                VStack {
                    Spacer()
                    WidgetProgressBar(progress: item.progress, height: 2)
                }
            }

            // Title
            Text(item.title)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(2)

            // Resume label + remaining time
            HStack(spacing: DesignTokens.Spacing.xs) {
                Text("Resume")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p400)
                Text(ContinueWatchingWidgetHelpers.remainingText(
                    progress: item.progress,
                    durationSeconds: item.durationSeconds
                ))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
            }
            .lineLimit(1)
        }
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
