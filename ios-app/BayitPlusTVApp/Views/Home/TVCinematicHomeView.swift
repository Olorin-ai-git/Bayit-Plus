#if os(tvOS)
    import AVFoundation
    import BayitBYOC
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Cinematic homepage layout: full-screen hero carousel + bottom dock.
    /// Replaces the classic Netflix-style content rows with a focused,
    /// two-pillar experience: AI showcase + Israeli culture highlights.
    struct TVCinematicHomeView: View {
        let viewModel: HomeViewModel

        @Environment(LocalizationManager.self) private var localization
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(BYOCSourceManager.self) private var byocManager
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(TVOnboardingPreferences.self) private var prefs

        @State private var heroCards: [CinematicHeroCard] = []
        @State private var activeCardIndex = 0
        @State private var dockOverlay: HomeDockDestination?
        @State private var liveChannelDetail: ChannelDetail?
        @State private var demoClipURL: URL?

        var body: some View {
            VStack(spacing: 0) {
                heroSection
                Spacer(minLength: 0)
                shabbatOverlay
                    .allowsHitTesting(false)
                dockSection
                heroPageIndicator
                    .padding(.top, TVDesignTokens.Spacing.xs)
                    .padding(.bottom, TVDesignTokens.Spacing.sm)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .task { await loadHeroData() }
            .fullScreenCover(item: $dockOverlay) { dest in
                dockOverlayView(for: dest)
            }
        }

        // MARK: - Hero Section

        private var heroSection: some View {
            GlassHeroCarousel(
                items: heroCards,
                autoAdvanceInterval: 8,
                showPageIndicator: false
            ) { card, isActive in
                TVCinematicHeroCardView(card: card, isActive: isActive) { action in
                    handleHeroAction(card: card, action: action)
                }
                .onAppear {
                    if let idx = heroCards.firstIndex(where: { $0.id == card.id }) {
                        activeCardIndex = idx
                    }
                }
            }
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
        }

        // MARK: - Page Indicator

        private var heroPageIndicator: some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                ForEach(heroCards.indices, id: \.self) { index in
                    Circle()
                        .fill(
                            index == activeCardIndex
                                ? DesignTokens.Colors.Primary.light
                                : DesignTokens.Text.muted
                        )
                        .frame(
                            width: index == activeCardIndex ? 10 : 6,
                            height: index == activeCardIndex ? 10 : 6
                        )
                        .animation(.easeInOut(duration: 0.2), value: activeCardIndex)
                }
            }
            .allowsHitTesting(false)
        }

        // MARK: - Shabbat Overlay

        private var shabbatOverlay: some View {
            TVShabbatBannerView()
                .withAutoLoad()
        }

        // MARK: - Hero Data Loading

        private func loadHeroData() async {
            async let channelTask: () = loadFirstLiveChannel()
            async let demoTask: () = loadDemoClipURL()
            _ = await (channelTask, demoTask)
            buildHeroCards()
        }

        private func loadFirstLiveChannel() async {
            do {
                let response = try await repos.liveTV.fetchChannels(
                    cultureId: nil, category: nil
                )
                let preferred = response.channels.first {
                    $0.name?.contains("13") == true
                } ?? response.channels.first
                guard let channel = preferred else { return }
                liveChannelDetail = try await repos.liveTV.fetchChannelDetail(
                    id: channel.id
                )
            } catch {}
        }

        private func loadDemoClipURL() async {
            let stubDeps = FeatureAvailabilityDependencies(
                isPremium: { false },
                hasAvatar: { false },
                hasMicrophonePermission: { false },
                hasCompletedPreference: { _ in false }
            )
            let discoverVM = DiscoverViewModel(
                repository: repos.discover,
                availabilityService: FeatureAvailabilityService(
                    dependencies: stubDeps
                )
            )
            await discoverVM.loadConfig()
            demoClipURL = discoverVM.demoVideoURL(for: "pause-ask")
        }

        // MARK: - Hero Card Builder

        private func buildHeroCards() {
            var cards: [CinematicHeroCard] = []
            let hasBYOC = !byocManager.plexItems.isEmpty
                || !byocManager.youtubeItems.isEmpty
            let hasHistory = !viewModel.continueWatching.isEmpty

            if hasBYOC, let byocCard = firstBYOCCard() {
                cards.append(byocCard)
            }

            if hasHistory, let resumeCard = continueWatchingCard() {
                cards.append(resumeCard)
            }

            if cards.first?.type != .liveAIShowcase, let tvCard = liveAIShowcaseCard() {
                cards.append(tvCard)
            }

            cards.append(movieAIShowcaseCard())

            if cards.first?.type != .byocShowcase, hasBYOC,
               let byocCard = firstBYOCCard()
            {
                if !cards.contains(where: { $0.type == .byocShowcase }) {
                    cards.append(byocCard)
                }
            }

            cards.append(randomCultureCard())

            heroCards = Array(cards.prefix(5))
        }

        // MARK: - Card Builders

        private func firstBYOCCard() -> CinematicHeroCard? {
            let item = byocManager.plexItems.first
                ?? byocManager.youtubeItems.first
            guard let item else { return nil }
            return CinematicHeroCard(
                id: "byoc-showcase",
                type: .byocShowcase,
                title: item.title ?? localization.t("cinematic.byoc.title"),
                subtitle: localization.t("cinematic.byoc.subtitle"),
                backgroundURL: item.thumbnailURL,
                videoURL: item.streamURL
            )
        }

        private func continueWatchingCard() -> CinematicHeroCard? {
            guard let item = viewModel.continueWatching.first else { return nil }
            return CinematicHeroCard(
                id: "continue-watching",
                type: .continueWatching,
                title: item.title ?? localization.t("home.continueWatching"),
                subtitle: localization.t("cinematic.continueWatching.subtitle"),
                backgroundURL: item.thumbnail.flatMap { URL(string: $0) },
                resumePosition: item.position
            )
        }

        private func liveAIShowcaseCard() -> CinematicHeroCard? {
            guard let detail = liveChannelDetail else { return nil }
            let streamURL = detail.streamUrl.flatMap { URL(string: $0) }
            return CinematicHeroCard(
                id: "live-ai-showcase",
                type: .liveAIShowcase,
                title: detail.name
                    ?? localization.t("cinematic.liveTV.title"),
                subtitle: localization.t("cinematic.liveTV.subtitle"),
                backgroundURL: (detail.logo ?? detail.thumbnail)
                    .flatMap { URL(string: $0) },
                categoryLabel: localization.t("cinematic.liveAI.groupLabel"),
                videoURL: streamURL,
                channelId: detail.id
            )
        }

        private func movieAIShowcaseCard() -> CinematicHeroCard {
            let videoSource = demoClipURL
                ?? liveChannelDetail?.streamUrl.flatMap { URL(string: $0) }

            let byocItem = byocManager.plexItems.first
                ?? byocManager.youtubeItems.first
            let spotlightItem = viewModel.spotlight.first
            let spotlightBackdrop: URL? = spotlightItem
                .flatMap { $0.backdrop ?? $0.thumbnail }
                .flatMap { URL(string: $0) }
            let backgroundURL = byocItem?.thumbnailURL ?? spotlightBackdrop
            let bgVideoURL = byocItem?.streamURL ?? videoSource
            let movieId = spotlightItem?.id

            return CinematicHeroCard(
                id: "movie-ai-showcase",
                type: .movieAIShowcase,
                title: localization.t("cinematic.pauseAsk.title"),
                subtitle: localization.t("cinematic.pauseAsk.subtitle"),
                backgroundAsset: backgroundURL == nil ? "Masada" : nil,
                backgroundURL: backgroundURL,
                categoryLabel: localization.t("cinematic.movieAI.groupLabel"),
                videoURL: bgVideoURL,
                channelId: movieId
            )
        }

        private func randomCultureCard() -> CinematicHeroCard {
            let cultureOptions: [(id: String, titleKey: String, subtitleKey: String, asset: String)] = [
                ("culture-whats-hot", "home.whatsHot", "cinematic.culture.whatsHotSubtitle", "Masada"),
                ("culture-jerusalem", "home.jerusalem", "cinematic.culture.jerusalemSubtitle", "Jerusalem"),
                ("culture-tel-aviv", "home.telAviv", "cinematic.culture.telAvivSubtitle", "TelAviv"),
                ("culture-near-me", "home.nearMe", "cinematic.culture.nearMeSubtitle", "Masada"),
            ]
            let pick = cultureOptions.randomElement()!
            return CinematicHeroCard(
                id: pick.id,
                type: .culture,
                title: localization.t(pick.titleKey),
                subtitle: localization.t(pick.subtitleKey),
                backgroundAsset: pick.asset,
                categoryLabel: localization.t(pick.titleKey)
            )
        }

        // MARK: - Navigation

        private func handleHeroAction(
            card: CinematicHeroCard,
            action: CinematicHeroAction
        ) {
            switch card.type {
            case .liveAIShowcase:
                if let channelId = card.channelId {
                    coordinator.presentPlayer(
                        contentId: channelId,
                        contentType: .liveTV,
                        channelId: channelId,
                        isWalkthrough: true
                    )
                }
            case .byocShowcase:
                if let url = card.videoURL {
                    coordinator.presentPlayer(
                        contentId: card.id,
                        contentType: .vod,
                        directUrl: url.absoluteString
                    )
                }
            case .movieAIShowcase:
                if action == .secondary, let movieId = card.channelId {
                    coordinator.fullscreenRoute = .movieDetail(movieId: movieId)
                } else {
                    handleMovieAINavigation()
                }
            case .continueWatching:
                let item = viewModel.continueWatching.first
                if let item {
                    if action == .secondary {
                        coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
                    } else {
                        coordinator.presentPlayer(
                            contentId: item.id,
                            contentType: .vod
                        )
                    }
                }
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
                        categoryName: "Jerusalem"
                    )
                case "culture-tel-aviv":
                    coordinator.presentCategoryBrowse(
                        title: localization.t("home.telAviv"),
                        icon: "sun.max.fill",
                        categoryName: "Tel Aviv"
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

        private func handleMovieAINavigation() {
            if let byocItem = byocManager.plexItems.first
                ?? byocManager.youtubeItems.first,
                let url = byocItem.streamURL
            {
                coordinator.presentPlayer(
                    contentId: byocItem.id,
                    contentType: .vod,
                    directUrl: url.absoluteString,
                    isWalkthrough: true
                )
            } else if let item = viewModel.continueWatching.first {
                coordinator.presentPlayer(
                    contentId: item.id,
                    contentType: .vod,
                    isWalkthrough: true
                )
            } else if let spotlightItem = viewModel.spotlight.first {
                coordinator.presentPlayer(
                    contentId: spotlightItem.id,
                    contentType: .vod,
                    isWalkthrough: true
                )
            }
        }

        private func handleDockNavigation(_ destination: HomeDockDestination) {
            switch destination {
            case .liveAI:
                if let channelId = liveChannelDetail?.id {
                    coordinator.presentPlayer(
                        contentId: channelId,
                        contentType: .liveTV,
                        channelId: channelId,
                        isWalkthrough: true
                    )
                } else {
                    dockOverlay = destination
                }
            case .movieAI:
                handleMovieAINavigation()
            case .zehAni:
                dockOverlay = destination
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

        @ViewBuilder
        private func dockOverlayView(for dest: HomeDockDestination) -> some View {
            let content = switch dest {
            case .liveAI: AnyView(TVLiveTVView())
            case .zehAni: AnyView(TVZehAniHubView())
            default: AnyView(EmptyView())
            }
            ZStack(alignment: .topLeading) {
                content
                dockOverlayBackButton
            }
            .background(DesignTokens.Background.primary)
            .onExitCommand { dockOverlay = nil }
        }

        private var dockOverlayBackButton: some View {
            Button { dockOverlay = nil } label: {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                    Text(localization.t("nav.home"))
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                }
                .foregroundStyle(DesignTokens.Text.secondary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(DesignTokens.Glass.border, lineWidth: 1))
            }
            .tvCardStyle()
            .padding(.top, TVDesignTokens.Spacing.lg)
            .padding(.leading, TVDesignTokens.Spacing.xl)
        }
    }

    // MARK: - Data Models

    enum CinematicHeroCardType {
        case liveAIShowcase
        case byocShowcase
        case movieAIShowcase
        case continueWatching
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
        let videoURL: URL?
        let channelId: String?
        let contentItem: ContentItem?
        let resumePosition: TimeInterval?

        init(
            id: String,
            type: CinematicHeroCardType,
            title: String,
            subtitle: String,
            backgroundAsset: String? = nil,
            backgroundURL: URL? = nil,
            categoryLabel: String? = nil,
            videoURL: URL? = nil,
            channelId: String? = nil,
            contentItem: ContentItem? = nil,
            resumePosition: TimeInterval? = nil
        ) {
            self.id = id
            self.type = type
            self.title = title
            self.subtitle = subtitle
            self.backgroundAsset = backgroundAsset
            self.backgroundURL = backgroundURL
            self.categoryLabel = categoryLabel
            self.videoURL = videoURL
            self.channelId = channelId
            self.contentItem = contentItem
            self.resumePosition = resumePosition
        }
    }

    // MARK: - Hero Card View

    struct TVCinematicHeroCardView: View {
        let card: CinematicHeroCard
        let isActive: Bool
        let onAction: (CinematicHeroAction) -> Void

        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            ZStack(alignment: .bottom) {
                backgroundLayer
                gradientOverlay
                contentOverlay
            }
            .overlay(alignment: .top) {
                if isActive { aiOverlayLayer }
            }
            .mask(heroMask)
            .shadow(color: .black.opacity(0.5), radius: 30, x: 0, y: 10)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.top, TVDesignTokens.Spacing.md)
        }

        private var heroMask: some View {
            VStack(spacing: 0) {
                Rectangle()
                LinearGradient(
                    colors: [.white, .clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 60)
            }
        }

        @ViewBuilder
        private var aiOverlayLayer: some View {
            switch card.type {
            case .liveAIShowcase:
                TVHeroLiveTVOverlay()
            case .byocShowcase:
                TVHeroBYOCOverlay()
            case .movieAIShowcase:
                TVHeroMovieAIOverlay()
            case .continueWatching:
                TVHeroContinueWatchingOverlay(
                    progress: card.resumePosition.map { $0 / 7200.0 } ?? 0
                )
            case .culture:
                EmptyView()
            }
        }

        private var hasVideo: Bool {
            card.videoURL != nil && card.type != .culture
        }

        private var backgroundLayer: some View {
            ZStack {
                staticBackground
                if hasVideo, isActive, let url = card.videoURL {
                    TVHeroVideoPlayerView(
                        url: url,
                        isActive: isActive,
                        resumePosition: card.resumePosition
                    )
                }
            }
            .clipped()
        }

        private var staticBackground: some View {
            Group {
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
            .frame(maxWidth: .infinity, maxHeight: .infinity)
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
            VStack(alignment: .center, spacing: TVDesignTokens.Spacing.sm) {
                if let label = card.categoryLabel {
                    categoryBadge(label)
                }

                if card.type == .byocShowcase {
                    aiBadge
                }

                Text(card.title)
                    .font(.system(
                        size: TVDesignTokens.FontSize.xxl,
                        weight: .bold
                    ))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
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
            .padding(.bottom, TVDesignTokens.Spacing.xxl)
            .frame(maxWidth: .infinity)
        }

        private var primaryButton: some View {
            Button { onAction(.primary) } label: {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: primaryIcon)
                        .font(.system(
                            size: TVDesignTokens.FontSize.md,
                            weight: .bold
                        ))
                    Text(primaryLabel)
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

        private var primaryIcon: String {
            switch card.type {
            case .liveAIShowcase: return "play.tv"
            case .byocShowcase: return "sparkles"
            case .movieAIShowcase: return "play.fill"
            case .continueWatching: return "play.fill"
            case .culture: return "arrow.right"
            }
        }

        private var primaryLabel: String {
            switch card.type {
            case .liveAIShowcase:
                return localization.t("cinematic.liveTV.watchDubbed")
            case .byocShowcase:
                return localization.t("cinematic.byoc.watchWithAI")
            case .movieAIShowcase:
                return localization.t("cinematic.pauseAsk.tryItNow")
            case .continueWatching:
                return localization.t("cinematic.continueWatching.resume")
            case .culture:
                return localization.t("cinematic.explore")
            }
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
