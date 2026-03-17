#if os(tvOS)
    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Cinematic homepage layout: full-screen hero carousel + bottom dock.
    /// Replaces the classic Netflix-style content rows with a focused,
    /// two-pillar experience: AI showcase + Israeli culture highlights.
    struct TVCinematicHomeView: View {
        let viewModel: HomeViewModel

        @Environment(LocalizationManager.self) private var localization
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(BYOCSourceManager.self) private var byocManager

        @State private var heroCards: [CinematicHeroCard] = []
        @FocusState private var focusZone: FocusZone?

        private enum FocusZone: Hashable {
            case hero
            case dock
        }

        var body: some View {
            ZStack(alignment: .top) {
                VStack(spacing: 0) {
                    heroSection
                    dockSection
                }

                shabbatOverlay
            }
            .onAppear { buildHeroCards() }
        }

        // MARK: - Hero Section

        private var heroSection: some View {
            GlassHeroCarousel(
                items: heroCards,
                autoAdvanceInterval: 8
            ) { card in
                TVCinematicHeroCardView(card: card) { action in
                    handleHeroAction(card: card, action: action)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .focusSection()
            .focused($focusZone, equals: .hero)
        }

        // MARK: - Dock Section

        private var dockSection: some View {
            TVHomeDock(
                showContinueWatching: !viewModel.continueWatching.isEmpty,
                showPlex: !byocManager.plexItems.isEmpty,
                showYouTube: !byocManager.youtubeItems.isEmpty
            ) { destination in
                handleDockNavigation(destination)
            }
            .padding(.bottom, TVDesignTokens.Spacing.xl)
            .focusSection()
            .focused($focusZone, equals: .dock)
        }

        // MARK: - Shabbat Overlay

        private var shabbatOverlay: some View {
            TVShabbatBannerView()
                .withAutoLoad()
        }

        // MARK: - Hero Card Builder

        private func buildHeroCards() {
            var cards: [CinematicHeroCard] = []

            // AI showcase: use first spotlight item's backdrop if available
            let aiBackdropURL: URL? = viewModel.spotlight.first
                .flatMap { $0.backdrop ?? $0.thumbnail }
                .flatMap { URL(string: $0) }

            cards.append(CinematicHeroCard(
                id: "ai-showcase",
                type: .aiShowcase,
                title: localization.t("cinematic.aiShowcase.title"),
                subtitle: localization.t("cinematic.aiShowcase.subtitle"),
                backgroundAsset: aiBackdropURL == nil ? "Masada" : nil,
                backgroundURL: aiBackdropURL,
                categoryLabel: nil
            ))

            var cultureCards: [CinematicHeroCard] = []

            cultureCards.append(CinematicHeroCard(
                id: "culture-whats-hot",
                type: .culture,
                title: localization.t("home.whatsHot"),
                subtitle: localization.t("cinematic.culture.whatsHotSubtitle"),
                backgroundAsset: "Masada",
                backgroundURL: nil,
                categoryLabel: localization.t("home.whatsHot")
            ))

            cultureCards.append(CinematicHeroCard(
                id: "culture-jerusalem",
                type: .culture,
                title: localization.t("home.jerusalem"),
                subtitle: localization.t("cinematic.culture.jerusalemSubtitle"),
                backgroundAsset: "Jerusalem",
                backgroundURL: nil,
                categoryLabel: localization.t("home.jerusalem")
            ))

            cultureCards.append(CinematicHeroCard(
                id: "culture-tel-aviv",
                type: .culture,
                title: localization.t("home.telAviv"),
                subtitle: localization.t("cinematic.culture.telAvivSubtitle"),
                backgroundAsset: "TelAviv",
                backgroundURL: nil,
                categoryLabel: localization.t("home.telAviv")
            ))

            cultureCards.append(CinematicHeroCard(
                id: "culture-near-me",
                type: .culture,
                title: localization.t("home.nearMe"),
                subtitle: localization.t("cinematic.culture.nearMeSubtitle"),
                backgroundAsset: "Masada",
                backgroundURL: nil,
                categoryLabel: localization.t("home.nearMe")
            ))

            cultureCards.shuffle()
            cards.append(contentsOf: cultureCards)

            heroCards = cards
        }

        // MARK: - Navigation

        private func handleHeroAction(
            card: CinematicHeroCard,
            action _: CinematicHeroAction
        ) {
            switch card.type {
            case .aiShowcase:
                coordinator.selectedTab = .discover
            case .culture:
                switch card.id {
                case "culture-whats-hot":
                    coordinator.presentCategoryBrowse(
                        title: localization.t("home.whatsHot"),
                        icon: "flame.fill",
                        categoryName: "whatsHot"
                    )
                case "culture-jerusalem":
                    coordinator.presentCategoryBrowse(
                        title: localization.t("home.jerusalem"),
                        icon: "building.columns",
                        categoryName: "jerusalem"
                    )
                case "culture-tel-aviv":
                    coordinator.presentCategoryBrowse(
                        title: localization.t("home.telAviv"),
                        icon: "sun.max.fill",
                        categoryName: "telAviv"
                    )
                case "culture-near-me":
                    coordinator.presentCategoryBrowse(
                        title: localization.t("home.nearMe"),
                        icon: "location.fill",
                        categoryName: "nearMe"
                    )
                default:
                    break
                }
            }
        }

        private func handleDockNavigation(_ destination: HomeDockDestination) {
            switch destination {
            case .discover:
                coordinator.selectedTab = .discover
            case .liveTV:
                coordinator.selectedTab = .liveTV
            case .listen:
                coordinator.selectedTab = .podcasts
            case .continueWatching:
                coordinator.presentCategoryBrowse(
                    title: localization.t("home.continueWatching"),
                    icon: "play.circle.fill",
                    categoryName: "continueWatching"
                )
            case .plex:
                coordinator.selectedTab = .byoc
            case .youtube:
                coordinator.selectedTab = .byoc
            }
        }
    }

    // MARK: - Data Models

    enum CinematicHeroCardType {
        case aiShowcase
        case culture
    }

    enum CinematicHeroAction {
        case primary
        case secondary
    }

    struct CinematicHeroCard: Identifiable {
        let id: String
        let type: CinematicHeroCardType
        let title: String
        let subtitle: String
        let backgroundAsset: String?
        let backgroundURL: URL?
        let categoryLabel: String?
    }

    // MARK: - Hero Card View

    struct TVCinematicHeroCardView: View {
        let card: CinematicHeroCard
        let onAction: (CinematicHeroAction) -> Void

        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            ZStack(alignment: .bottomLeading) {
                backgroundLayer
                gradientOverlay
                contentOverlay
            }
        }

        private var backgroundLayer: some View {
            Color.clear
                .overlay(alignment: .top) {
                    if let url = card.backgroundURL {
                        CachedAsyncImage(url: url) { phase in
                            if case let .success(img) = phase {
                                img.resizable()
                                    .aspectRatio(contentMode: .fill)
                            } else {
                                DesignTokens.Glass.purpleLight
                            }
                        }
                    } else if let asset = card.backgroundAsset {
                        Image(asset)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } else {
                        DesignTokens.Glass.purpleLight
                    }
                }
                .clipped()
        }

        private var gradientOverlay: some View {
            LinearGradient(
                stops: [
                    .init(color: .clear, location: 0.0),
                    .init(
                        color: DesignTokens.Background.primary.opacity(0.3),
                        location: 0.35
                    ),
                    .init(
                        color: DesignTokens.Background.primary.opacity(0.8),
                        location: 0.7
                    ),
                    .init(color: DesignTokens.Background.primary, location: 1.0),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        }

        private var contentOverlay: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                if let label = card.categoryLabel {
                    categoryBadge(label)
                }

                if card.type == .aiShowcase {
                    aiBadge
                }

                Text(card.title)
                    .font(.system(
                        size: TVDesignTokens.FontSize.xxl,
                        weight: .bold
                    ))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.6), radius: 4, x: 0, y: 2)
                    .lineLimit(2)

                Text(card.subtitle)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(2)
                    .shadow(
                        color: .black.opacity(0.5),
                        radius: 3, x: 0, y: 1
                    )

                HStack(spacing: TVDesignTokens.Spacing.md) {
                    primaryButton
                    secondaryButton
                }
                .padding(.top, TVDesignTokens.Spacing.sm)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.bottom, TVDesignTokens.Spacing.xl)
        }

        private var primaryButton: some View {
            Button { onAction(.primary) } label: {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: card.type == .aiShowcase
                        ? "play.fill" : "arrow.right")
                        .font(.system(
                            size: TVDesignTokens.FontSize.md,
                            weight: .bold
                        ))
                    Text(card.type == .aiShowcase
                        ? localization.t("hero.watchNow")
                        : localization.t("cinematic.explore"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.md,
                            weight: .bold
                        ))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(Capsule().fill(DesignTokens.Primary.default))
            }
            .buttonStyle(HeroCinematicButtonStyle())
            .focusEffectDisabled()
        }

        private var secondaryButton: some View {
            Button { onAction(.secondary) } label: {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "info.circle")
                        .font(.system(size: TVDesignTokens.FontSize.md))
                    Text(localization.t("common.moreInfo"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.md,
                            weight: .semibold
                        ))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(Capsule().fill(Color.white.opacity(0.08)))
                .overlay(
                    Capsule().stroke(
                        DesignTokens.Glass.border,
                        lineWidth: 1
                    )
                )
            }
            .buttonStyle(HeroCinematicButtonStyle())
            .focusEffectDisabled()
        }

        private func categoryBadge(_ label: String) -> some View {
            Text(label.uppercased())
                .font(.system(size: TVDesignTokens.FontSize.xs, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p300)
                .kerning(1.2)
                .padding(.horizontal, TVDesignTokens.Spacing.md)
                .padding(.vertical, TVDesignTokens.Spacing.xxs)
                .background(DesignTokens.Glass.bgStrong)
                .clipShape(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                )
        }

        private var aiBadge: some View {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: "sparkles")
                    .font(.system(size: TVDesignTokens.FontSize.xs, weight: .bold))
                Text(localization.t("cinematic.aiBadge"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.xs,
                        weight: .bold
                    ))
            }
            .foregroundStyle(DesignTokens.Primary.p300)
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.xxs)
            .background(DesignTokens.Primary.p900.opacity(0.4))
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
            )
        }
    }

    // MARK: - Button Style

    private struct HeroCinematicButtonStyle: ButtonStyle {
        @Environment(\.isFocused) private var isFocused

        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .focusEffectDisabled()
                .brightness(isFocused ? 0.22 : 0)
                .scaleEffect(
                    isFocused
                        ? TVDesignTokens.Focus.scaleAmount
                        : (configuration.isPressed ? 0.97 : 1.0)
                )
                .shadow(
                    color: isFocused
                        ? DesignTokens.Glass.purpleGlow : .clear,
                    radius: TVDesignTokens.Focus.shadowRadius,
                    x: 0,
                    y: isFocused ? 6 : 0
                )
                .animation(
                    .easeInOut(
                        duration: TVDesignTokens.Focus.animationDuration
                    ),
                    value: isFocused
                )
                .animation(
                    .easeInOut(duration: 0.15),
                    value: configuration.isPressed
                )
        }
    }
#endif
