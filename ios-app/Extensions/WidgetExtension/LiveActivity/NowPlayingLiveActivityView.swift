import ActivityKit
import SwiftUI
import WidgetKit
import BayitDesignSystem
import BayitWidgetShared

/// Lock Screen Live Activity banner for now-playing content.
struct NowPlayingLiveActivityView: Widget {

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: NowPlayingAttributes.self) { context in
            // Lock Screen banner
            lockScreenBanner(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded regions
                DynamicIslandExpandedRegion(.leading) {
                    expandedLeading(context: context)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    expandedTrailing(context: context)
                }
                DynamicIslandExpandedRegion(.center) {
                    expandedCenter(context: context)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    expandedBottom(context: context)
                }
            } compactLeading: {
                compactLeading(context: context)
            } compactTrailing: {
                compactTrailing(context: context)
            } minimal: {
                minimalView(context: context)
            }
        }
    }

    // MARK: - Lock Screen Banner

    @ViewBuilder
    private func lockScreenBanner(
        context: ActivityViewContext<NowPlayingAttributes>
    ) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            // Channel logo
            if let logoURL = context.attributes.channelLogoURL {
                AsyncImage(url: logoURL) { image in
                    image.resizable().aspectRatio(contentMode: .fit)
                } placeholder: {
                    Image(systemName: "tv")
                        .font(.system(size: DesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }
                .frame(width: 40, height: 40)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            } else {
                Image(systemName: "tv")
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 40, height: 40)
            }

            // Info
            VStack(alignment: .leading, spacing: 2) {
                Text(context.attributes.channelName)
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(context.state.showTitle)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                // Progress bar
                WidgetProgressBar(progress: context.state.progress, height: 3)
            }

            Spacer()

            // Play/Pause indicator
            Image(systemName: context.state.isPlaying ? "pause.fill" : "play.fill")
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.p400)
        }
        .padding(DesignTokens.Spacing.md)
        .background(
            LinearGradient(
                colors: [DesignTokens.Background.primary, DesignTokens.Background.elevated],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }

    // MARK: - Dynamic Island: Compact

    @ViewBuilder
    private func compactLeading(
        context: ActivityViewContext<NowPlayingAttributes>
    ) -> some View {
        if let logoURL = context.attributes.channelLogoURL {
            AsyncImage(url: logoURL) { image in
                image.resizable().aspectRatio(contentMode: .fit)
            } placeholder: {
                Image(systemName: "tv")
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
            .frame(width: 20, height: 20)
            .clipShape(Circle())
        } else {
            Image(systemName: "tv")
                .foregroundStyle(DesignTokens.Primary.p400)
        }
    }

    @ViewBuilder
    private func compactTrailing(
        context: ActivityViewContext<NowPlayingAttributes>
    ) -> some View {
        Image(systemName: context.state.isPlaying ? "pause.fill" : "play.fill")
            .foregroundStyle(DesignTokens.Primary.p400)
    }

    // MARK: - Dynamic Island: Expanded

    @ViewBuilder
    private func expandedLeading(
        context: ActivityViewContext<NowPlayingAttributes>
    ) -> some View {
        if let logoURL = context.attributes.channelLogoURL {
            AsyncImage(url: logoURL) { image in
                image.resizable().aspectRatio(contentMode: .fit)
            } placeholder: {
                Image(systemName: "tv")
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
            .frame(width: 44, height: 44)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        }
    }

    @ViewBuilder
    private func expandedTrailing(
        context: ActivityViewContext<NowPlayingAttributes>
    ) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: context.state.isPlaying ? "pause.fill" : "play.fill")
                .font(.system(size: DesignTokens.FontSize.lg))
            Image(systemName: "forward.fill")
                .font(.system(size: DesignTokens.FontSize.md))
        }
        .foregroundStyle(DesignTokens.Primary.p400)
    }

    @ViewBuilder
    private func expandedCenter(
        context: ActivityViewContext<NowPlayingAttributes>
    ) -> some View {
        VStack(spacing: 2) {
            Text(context.attributes.channelName)
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(.secondary)
            Text(context.state.showTitle)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                .lineLimit(1)
        }
    }

    @ViewBuilder
    private func expandedBottom(
        context: ActivityViewContext<NowPlayingAttributes>
    ) -> some View {
        ProgressView(value: min(max(context.state.progress, 0), 1))
            .tint(DesignTokens.Primary.default)
    }

    // MARK: - Dynamic Island: Minimal

    @ViewBuilder
    private func minimalView(
        context: ActivityViewContext<NowPlayingAttributes>
    ) -> some View {
        Image(systemName: context.state.isPlaying ? "play.fill" : "pause.fill")
            .foregroundStyle(DesignTokens.Primary.p400)
    }
}
