import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Small Continue Watching widget: single item with play overlay + progress + remaining time.
struct ContinueWatchingSmallView: View {
    let entry: ContinueWatchingEntry

    var body: some View {
        if let item = entry.items.first {
            Link(destination: WidgetDeepLinks.resume(id: item.contentID, type: item.contentType)) {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    // Thumbnail with play overlay and progress bar
                    ZStack(alignment: .bottomLeading) {
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
                            WidgetProgressBar(progress: item.progress, height: 3)
                        }
                    }

                    // Title
                    Text(item.title)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)
                        .accessibilityLabel("Continue watching \(item.title)")

                    // Remaining time
                    Text(ContinueWatchingWidgetHelpers.remainingText(
                        progress: item.progress,
                        durationSeconds: item.durationSeconds
                    ))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .lineLimit(1)
                }
                .padding(DesignTokens.Spacing.md)
                .frame(minWidth: 44, minHeight: 44)
            }
            .accessibilityLabel("Continue watching \(item.title)")
            .accessibilityHint("Resumes \(item.title) where you left off")
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
}
