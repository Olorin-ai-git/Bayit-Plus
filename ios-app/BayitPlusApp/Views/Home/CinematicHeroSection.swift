import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Full-screen hero section: video/image background, gradient, overlays,
/// content metadata, page indicators, and quick-toggle button.
struct CinematicHeroSection: View {
    let heroCards: [CinematicHeroCard]
    @Binding var currentIndex: Int
    let scrollProgress: CGFloat
    let onToggleStyle: () -> Void
    let onCardAction: (CinematicHeroCard, CinematicHeroAction) -> Void

    @Environment(LocalizationManager.self) private var localization
    @Environment(\.horizontalSizeClass) private var sizeClass

    @AppStorage("bayit.plus.cinematic.scrollHintCount")
    private var scrollHintCount: Int = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            backgroundLayer
            gradientOverlay
            contentOverlay
                .opacity(overlayOpacity)
                .offset(y: scrollProgress * -40)
        }
        .frame(height: heroHeight)
        .clipped()
        .onAppear {
            if scrollHintCount < 3 {
                scrollHintCount += 1
            }
        }
    }

    // MARK: - Dimensions

    private var heroHeight: CGFloat {
        let screenHeight = UIScreen.main.bounds.height
        return sizeClass == .regular ? screenHeight * 0.6 : screenHeight
    }

    private var overlayOpacity: Double {
        max(0, 1.0 - Double(scrollProgress) * 1.5)
    }

    // MARK: - Background

    private var backgroundLayer: some View {
        iOSHeroCarousel(
            items: heroCards,
            autoAdvanceInterval: 8,
            currentIndex: $currentIndex
        ) { card, isActive in
            heroBackground(card: card, isActive: isActive)
        }
        .scaleEffect(1.0 - scrollProgress * 0.05)
        .opacity(1.0 - Double(scrollProgress) * 0.7)
    }

    @ViewBuilder
    private func heroBackground(
        card: CinematicHeroCard,
        isActive: Bool
    ) -> some View {
        let videoSupported = DeviceCapability.shared.videoHeroSupported
        ZStack {
            if videoSupported, let videoURL = card.videoURL {
                HeroVideoPlayerView(
                    url: videoURL,
                    isActive: isActive,
                    resumePosition: card.resumePosition
                )
            } else if let imageURL = card.backgroundURL {
                AsyncImage(url: imageURL) { phase in
                    if let image = phase.image {
                        image.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        assetOrGradient(card.backgroundAsset)
                    }
                }
            } else {
                assetOrGradient(card.backgroundAsset)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
    }

    @ViewBuilder
    private func assetOrGradient(_ asset: String?) -> some View {
        if let asset {
            Image(asset)
                .resizable()
                .aspectRatio(contentMode: .fill)
        } else {
            LinearGradient(
                colors: [
                    DesignTokens.Primary.p900,
                    DesignTokens.Background.primary,
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    // MARK: - Gradient

    private var gradientOverlay: some View {
        LinearGradient(
            colors: [
                .clear,
                DesignTokens.Background.primary.opacity(0.3),
                DesignTokens.Background.primary.opacity(0.8),
                DesignTokens.Background.primary,
            ],
            startPoint: .top,
            endPoint: .bottom
        )
        .allowsHitTesting(false)
    }

    // MARK: - Content Overlay

    private var contentOverlay: some View {
        VStack(spacing: 0) {
            topBar
            Spacer()
            if !heroCards.isEmpty {
                bottomContent(heroCards[currentIndex])
            }
            scrollHint
            pageIndicator
                .padding(.bottom, DesignTokens.Spacing.lg)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            Spacer()
            VStack(alignment: .trailing, spacing: DesignTokens.Spacing.sm) {
                toggleButton
                if !heroCards.isEmpty {
                    CinematicHeroOverlay(card: heroCards[currentIndex])
                }
            }
        }
        .padding(.top, DesignTokens.Spacing.xxxxl)
    }

    private var toggleButton: some View {
        Button(action: onToggleStyle) {
            Image(systemName: "rectangle.on.rectangle")
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(.white.opacity(0.7))
                .padding(DesignTokens.Spacing.sm)
                .background(.ultraThinMaterial)
                .clipShape(Circle())
        }
        .accessibilityLabel(localization.t("cinematic.toggle.classic"))
    }

    // MARK: - Bottom Content

    private func bottomContent(_ card: CinematicHeroCard) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if let label = card.categoryLabel {
                Text(label.uppercased())
                    .font(.system(
                        size: DesignTokens.FontSize.xs,
                        weight: .bold
                    ))
                    .kerning(1.2)
                    .foregroundStyle(.white.opacity(0.7))
                    .padding(.horizontal, DesignTokens.Spacing.sm)
                    .padding(.vertical, 4)
                    .background(DesignTokens.Glass.bgStrong)
                    .clipShape(Capsule())
            }

            if card.showAIBadge {
                HStack(spacing: 4) {
                    Image(systemName: "sparkles")
                        .font(.system(size: DesignTokens.FontSize.xs))
                    Text(localization.t("cinematic.aiBadge"))
                        .font(.system(
                            size: DesignTokens.FontSize.xs,
                            weight: .medium
                        ))
                }
                .foregroundStyle(DesignTokens.Primary.p400)
            }

            Text(card.title)
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(.white)
                .shadow(radius: 4)
                .lineLimit(2)

            Text(card.subtitle)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .lineLimit(2)

            actionButtons(card)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Action Buttons

    private func actionButtons(_ card: CinematicHeroCard) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Button {
                onCardAction(card, .primary)
            } label: {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: primaryIcon(for: card.type))
                        .font(.system(size: 16))
                    Text(primaryLabel(for: card))
                        .font(.system(
                            size: DesignTokens.FontSize.md,
                            weight: .semibold
                        ))
                }
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, DesignTokens.Spacing.md)
                .background(Color.white)
                .clipShape(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                )
            }
            .buttonStyle(.plain)

            Button {
                onCardAction(card, .secondary)
            } label: {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "info.circle.fill")
                        .font(.system(size: 16))
                    Text(localization.t("cinematic.hero.moreInfo"))
                        .font(.system(
                            size: DesignTokens.FontSize.md,
                            weight: .semibold
                        ))
                }
                .foregroundColor(DesignTokens.Text.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, DesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgStrong)
                .clipShape(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                )
            }
            .buttonStyle(.plain)
        }
        .padding(.top, DesignTokens.Spacing.xs)
    }

    private func primaryIcon(for type: CinematicHeroCardType) -> String {
        switch type {
        case .podcast: return "headphones"
        case .trending: return "flame"
        case .continueWatching: return "play.fill"
        default: return "play.fill"
        }
    }

    private func primaryLabel(for card: CinematicHeroCard) -> String {
        switch card.type {
        case .continueWatching:
            return localization.t("cinematic.hero.resume")
        case .podcast:
            return localization.t("cinematic.hero.listenNow")
        case .trending:
            return localization.t("cinematic.hero.exploreNow")
        default:
            return localization.t("cinematic.hero.watchNow")
        }
    }

    // MARK: - Scroll Hint

    private var scrollHint: some View {
        Group {
            if scrollHintCount <= 3 {
                VStack(spacing: 4) {
                    Text(localization.t("cinematic.scrollHint"))
                        .font(.system(
                            size: DesignTokens.FontSize.xs,
                            weight: .medium
                        ))
                        .foregroundStyle(.white.opacity(0.5))
                    Image(systemName: "chevron.down")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(.white.opacity(0.5))
                }
                .opacity(scrollProgress < 0.1 ? 1 : 0)
                .animation(
                    .easeOut(duration: 0.3), value: scrollProgress < 0.1
                )
                .padding(.bottom, DesignTokens.Spacing.sm)
            }
        }
    }

    // MARK: - Page Indicator

    private var pageIndicator: some View {
        HStack(spacing: 6) {
            ForEach(heroCards.indices, id: \.self) { index in
                Circle()
                    .fill(
                        index == currentIndex
                            ? Color.white : Color.white.opacity(0.3)
                    )
                    .frame(
                        width: index == currentIndex ? 8 : 6,
                        height: index == currentIndex ? 8 : 6
                    )
                    .animation(
                        .spring(duration: 0.3), value: currentIndex
                    )
            }
        }
    }
}
