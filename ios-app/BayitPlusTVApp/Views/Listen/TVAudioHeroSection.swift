#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Full-width rotating hero banner showcasing featured audio content.
    /// Cycles through featured podcasts, audiobooks, and radio stations
    /// with a backdrop image and metadata overlay.
    struct TVAudioHeroSection: View {
        @Environment(TVNavigationCoordinator.self) var coordinator
        @Environment(TVAudioPlaybackManager.self) var audioManager
        @Environment(LocalizationManager.self) var localization

        let podcastShows: [PodcastShow]
        let audiobooks: [Audiobook]
        let radioStations: [RadioStationItem]

        @State private var selectedIndex = 0
        @State private var rotationTimer: Timer?

        private var heroItems: [HeroItem] {
            var items: [HeroItem] = []
            for audiobook in audiobooks.prefix(3) where audiobook.isFeatured == true {
                items.append(HeroItem(
                    id: audiobook.id, title: audiobook.title,
                    subtitle: audiobook.author, imageURL: audiobook.backdrop ?? audiobook.thumbnail,
                    contentType: .audiobook
                ))
            }
            for show in podcastShows.prefix(3) {
                items.append(HeroItem(
                    id: show.id, title: show.title,
                    subtitle: show.author, imageURL: show.cover,
                    contentType: .podcast
                ))
            }
            for station in radioStations.prefix(2) {
                items.append(HeroItem(
                    id: station.id, title: station.name,
                    subtitle: station.currentShow ?? station.genre,
                    imageURL: station.logo, contentType: .radio
                ))
            }
            return items
        }

        var body: some View {
            if heroItems.isEmpty {
                EmptyView()
            } else {
                heroContent
            }
        }

        private var heroContent: some View {
            let item = heroItems[selectedIndex % max(heroItems.count, 1)]
            return Button {
                selectHeroItem(item)
            } label: {
                ZStack(alignment: .bottomLeading) {
                    heroBackdrop(item: item)
                    heroMetadata(item: item)
                }
                .frame(height: 500)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
            }
            .tvCardStyle()
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.top, TVDesignTokens.Spacing.lg)
            .onAppear { startRotation() }
            .onDisappear { stopRotation() }
        }

        private func heroBackdrop(item: HeroItem) -> some View {
            Group {
                if let urlStr = item.imageURL, let url = URL(string: urlStr) {
                    CachedAsyncImage(url: url) { phase in
                        if case let .success(img) = phase {
                            img.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            heroPlaceholder
                        }
                    }
                } else {
                    heroPlaceholder
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipped()
            .overlay {
                LinearGradient(
                    colors: [.clear, DesignTokens.Glass.bgStrong],
                    startPoint: .top, endPoint: .bottom
                )
            }
        }

        private func heroMetadata(item: HeroItem) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                Text(item.contentType.rawValue.uppercased())
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.default)

                Text(item.title ?? localization.t("common.untitled"))
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(2)

                if let subtitle = item.subtitle {
                    Text(subtitle)
                        .font(.system(size: TVDesignTokens.FontSize.xl))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(1)
                }
            }
            .padding(TVDesignTokens.Spacing.xxl)
        }

        private var heroPlaceholder: some View {
            LinearGradient(
                colors: [DesignTokens.Glass.purpleLight, DesignTokens.Glass.purpleStrong],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        }

        private func selectHeroItem(_ item: HeroItem) {
            audioManager.play(contentId: item.id, contentType: item.contentType)
        }

        private func startRotation() {
            guard heroItems.count > 1 else { return }
            rotationTimer = Timer.scheduledTimer(withTimeInterval: 8, repeats: true) { _ in
                Task { @MainActor in
                    withAnimation(.easeInOut) {
                        selectedIndex = (selectedIndex + 1) % heroItems.count
                    }
                }
            }
        }

        private func stopRotation() {
            rotationTimer?.invalidate()
            rotationTimer = nil
        }
    }

    private struct HeroItem {
        let id: String
        let title: String?
        let subtitle: String?
        let imageURL: String?
        let contentType: MediaContentType
    }
#endif
