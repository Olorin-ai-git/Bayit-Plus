import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Medium Continue Watching widget: header + 3 items with play icon + progress + remaining time.
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
                    .accessibilityAddTraits(.isHeader)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            if displayItems.isEmpty {
                emptyRow
            } else {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(displayItems) { item in
                        Link(destination: WidgetDeepLinks.resume(
                            id: item.contentID,
                            type: item.contentType
                        )) {
                            itemCard(item)
                        }
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityLabel("Continue watching \(item.title)")
                        .accessibilityHint("Resumes \(item.title) where you left off")
                        .accessibilityValue(ContinueWatchingWidgetHelpers.remainingText(
                            progress: item.progress,
                            durationSeconds: item.durationSeconds
                        ))
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
            // Thumbnail with play icon + progress overlay
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

                // Play icon overlay
                Image(systemName: "play.fill")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(.white)
                    .padding(DesignTokens.Spacing.xs)
                    .background(Circle().fill(Color.black.opacity(0.6)))
                    .padding(DesignTokens.Spacing.xs)

                // Progress overlay at bottom
                VStack {
                    Spacer()
                    WidgetProgressBar(progress: item.progress, height: 2)
                }
            }

            // Title
            Text(item.title)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)

            // Remaining time
            Text(ContinueWatchingWidgetHelpers.remainingText(
                progress: item.progress,
                durationSeconds: item.durationSeconds
            ))
            .font(.system(size: DesignTokens.FontSize.sm))
            .foregroundStyle(DesignTokens.Text.muted)
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
