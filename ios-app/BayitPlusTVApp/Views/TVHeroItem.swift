import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// Hero carousel item with background image, gradient overlay, metadata,
/// subtitle flags pill, and focusable "Watch Now" / "More Info" buttons.
/// Each button receives independent focus on tvOS Siri Remote.
struct TVHeroItem: View {
    let item: SpotlightItem
    let onWatchNow: () -> Void
    let onMoreInfo: () -> Void

    @Environment(LocalizationManager.self) private var localization
    @FocusState private var watchNowFocused: Bool
    @FocusState private var moreInfoFocused: Bool

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Background image - fills from top, clips overflow at bottom
            Color.clear
                .overlay(alignment: .top) {
                    if let urlStr = item.backdrop ?? item.thumbnail,
                       let url = URL(string: urlStr)
                    {
                        CachedAsyncImage(url: url) { phase in
                            if case let .success(img) = phase {
                                img.resizable()
                                    .aspectRatio(contentMode: .fill)
                            } else {
                                DesignTokens.Glass.purpleLight
                            }
                        }
                    } else {
                        DesignTokens.Glass.purpleLight
                    }
                }
                .clipped()

            // Full-width gradient overlay from bottom
            LinearGradient(
                stops: [
                    .init(color: .clear, location: 0.0),
                    .init(color: DesignTokens.Background.primary.opacity(0.3), location: 0.35),
                    .init(color: DesignTokens.Background.primary.opacity(0.8), location: 0.7),
                    .init(color: DesignTokens.Background.primary, location: 1.0),
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            // Text content at bottom-left
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                Text(item.title ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.6), radius: 4, x: 0, y: 2)
                    .lineLimit(2)

                HStack(spacing: TVDesignTokens.Spacing.md) {
                    if let year = item.year {
                        metadataText(String(year))
                    }
                    if let duration = item.duration {
                        metadataText(duration)
                    }
                    if let rating = item.rating {
                        ratingBadge(rating.value)
                    }

                    // Subtitle emoji flags
                    if let languages = item.availableSubtitleLanguages,
                       !languages.isEmpty
                    {
                        SubtitleFlagsPill(
                            languages: languages,
                            aiLanguages: [],
                            size: .medium
                        )
                    }
                }

                if let desc = item.description {
                    Text(desc)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(2)
                        .shadow(color: .black.opacity(0.5), radius: 3, x: 0, y: 1)
                }

                // Action buttons row
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    watchNowButton
                    moreInfoButton
                }
                .padding(.top, TVDesignTokens.Spacing.sm)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.bottom, TVDesignTokens.Spacing.xl)
        }
    }

    // MARK: - Watch Now Button

    private var watchNowButton: some View {
        Button(action: onWatchNow) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "play.fill")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .bold))
                Text(localization.t("hero.watchNow"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .bold))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(
                Capsule()
                    .fill(DesignTokens.Primary.default)
                    .brightness(watchNowFocused ? 0.22 : 0)
            )
            .shadow(
                color: watchNowFocused ? DesignTokens.Primary.p500.opacity(0.75) : .clear,
                radius: TVDesignTokens.Focus.shadowRadius,
                x: 0,
                y: 6
            )
        }
        .buttonStyle(.plain)
        .focused($watchNowFocused)
        .focusEffectDisabled()
        .scaleEffect(watchNowFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
        .animation(.easeInOut(duration: TVDesignTokens.Focus.animationDuration), value: watchNowFocused)
        .accessibilityLabel(localization.t("hero.watchNow"))
    }

    // MARK: - More Info Button

    private var moreInfoButton: some View {
        Button(action: onMoreInfo) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "info.circle")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                Text(localization.t("common.moreInfo"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(
                Capsule()
                    .fill(Color.white.opacity(moreInfoFocused ? 0.18 : 0.08))
            )
            .overlay(
                Capsule()
                    .stroke(
                        Color.white.opacity(moreInfoFocused ? 0.75 : 0.32),
                        lineWidth: moreInfoFocused ? 2.5 : 1.5
                    )
            )
        }
        .buttonStyle(.plain)
        .focused($moreInfoFocused)
        .focusEffectDisabled()
        .scaleEffect(moreInfoFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
        .animation(.easeInOut(duration: TVDesignTokens.Focus.animationDuration), value: moreInfoFocused)
        .accessibilityLabel(localization.t("common.moreInfo"))
    }

    private func metadataText(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.sm))
            .foregroundColor(DesignTokens.Text.secondary)
            .shadow(color: .black.opacity(0.5), radius: 3, x: 0, y: 1)
    }

    private func ratingBadge(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
            .foregroundColor(DesignTokens.Text.primary)
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .padding(.vertical, TVDesignTokens.Spacing.xxs)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
    }
}
