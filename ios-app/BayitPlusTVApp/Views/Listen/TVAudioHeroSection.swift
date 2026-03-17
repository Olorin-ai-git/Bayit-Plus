#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Full-width carousel hero for the Listen tab.
    /// Mixes audiobooks (with poster + description) and podcasts
    /// using GlassHeroCarousel with auto-advance.
    struct TVAudioHeroSection: View {
        @Environment(TVNavigationCoordinator.self) var coordinator
        @Environment(TVAudioPlaybackManager.self) var audioManager
        @Environment(LocalizationManager.self) var localization

        let podcastShows: [PodcastShow]
        let audiobooks: [Audiobook]
        let radioStations: [RadioStationItem]

        private var heroItems: [AudioHeroItem] {
            var items: [AudioHeroItem] = []
            for audiobook in audiobooks.prefix(4) {
                items.append(AudioHeroItem(
                    id: audiobook.id,
                    title: audiobook.title,
                    subtitle: audiobook.author,
                    description: audiobook.description,
                    badge: audiobook.duration,
                    posterURL: audiobook.thumbnail,
                    backdropURL: audiobook.backdrop ?? audiobook.thumbnail,
                    contentType: .audiobook
                ))
            }
            for show in podcastShows.prefix(4) {
                items.append(AudioHeroItem(
                    id: show.id,
                    title: show.title,
                    subtitle: show.author,
                    description: nil,
                    badge: show.latestEpisode,
                    posterURL: show.cover,
                    backdropURL: show.cover,
                    contentType: .podcast
                ))
            }
            return items.isEmpty ? [] : items
        }

        var body: some View {
            if heroItems.isEmpty {
                EmptyView()
            } else {
                GlassHeroCarousel(items: heroItems, autoAdvanceInterval: 7) { item, _ in
                    heroSlide(item)
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.top, TVDesignTokens.Spacing.lg)
            }
        }

        private func heroSlide(_ item: AudioHeroItem) -> some View {
            Button {
                selectItem(item)
            } label: {
                ZStack(alignment: .leading) {
                    backdrop(item)
                    slideContent(item)
                }
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
            }
            .buttonStyle(TVHeroSlideButtonStyle())
        }

        private func backdrop(_ item: AudioHeroItem) -> some View {
            Group {
                if let urlStr = item.backdropURL, let url = URL(string: urlStr) {
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
                    stops: [
                        .init(color: DesignTokens.Background.primary.opacity(0.9), location: 0),
                        .init(color: DesignTokens.Background.primary.opacity(0.7), location: 0.5),
                        .init(color: .clear, location: 1.0),
                    ],
                    startPoint: .leading, endPoint: .trailing
                )
            }
        }

        private func slideContent(_ item: AudioHeroItem) -> some View {
            HStack(alignment: .center, spacing: TVDesignTokens.Spacing.xxl) {
                posterImage(item)
                metadataColumn(item)
                Spacer()
            }
            .padding(TVDesignTokens.Spacing.xxl)
        }

        private func posterImage(_ item: AudioHeroItem) -> some View {
            Group {
                if let urlStr = item.posterURL, let url = URL(string: urlStr) {
                    CachedAsyncImage(url: url) { phase in
                        if case let .success(img) = phase {
                            ZStack {
                                DesignTokens.Background.primary
                                img.resizable().aspectRatio(contentMode: .fit)
                            }
                        } else {
                            posterPlaceholder(item)
                        }
                    }
                } else {
                    posterPlaceholder(item)
                }
            }
            .aspectRatio(
                item.contentType == .podcast ? 1.0 : 2 / 3,
                contentMode: .fit
            )
            .frame(height: TVDesignTokens.MinSize.heroHeight - 80)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster))
            .shadow(color: .black.opacity(0.4), radius: 12)
        }

        private func metadataColumn(_ item: AudioHeroItem) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(item.contentType == .audiobook
                    ? localization.t("audiobooks.audiobook").uppercased()
                    : localization.t("podcasts.podcast").uppercased())
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

                if let desc = item.description {
                    Text(desc)
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .lineLimit(3)
                        .lineSpacing(4)
                        .frame(maxWidth: 700, alignment: .leading)
                        .padding(.top, TVDesignTokens.Spacing.xs)
                }

                if let badge = item.badge {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "clock")
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                        Text(badge)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                    }
                    .foregroundStyle(DesignTokens.Text.muted)
                    .padding(.top, TVDesignTokens.Spacing.xs)
                }
            }
        }

        private var heroPlaceholder: some View {
            LinearGradient(
                colors: [DesignTokens.Glass.purpleLight, DesignTokens.Glass.purpleStrong],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        }

        private func posterPlaceholder(_ item: AudioHeroItem) -> some View {
            ZStack {
                LinearGradient(
                    colors: [DesignTokens.Glass.purpleLight, DesignTokens.Glass.purpleStrong],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
                Image(systemName: item.contentType == .audiobook ? "book.closed" : "headphones")
                    .font(.system(size: 48))
                    .foregroundStyle(DesignTokens.Text.muted.opacity(0.5))
            }
        }

        private func selectItem(_ item: AudioHeroItem) {
            switch item.contentType {
            case .audiobook:
                coordinator.fullscreenRoute = .audiobookDetail(audiobookId: item.id)
            case .podcast:
                coordinator.fullscreenRoute = .podcastDetail(showId: item.id)
            default:
                audioManager.play(contentId: item.id, contentType: item.contentType)
            }
        }
    }

    private struct AudioHeroItem: Identifiable {
        let id: String
        let title: String?
        let subtitle: String?
        let description: String?
        let badge: String?
        let posterURL: String?
        let backdropURL: String?
        let contentType: MediaContentType
    }

    private struct TVHeroSlideButtonStyle: ButtonStyle {
        @Environment(\.isFocused) private var isFocused

        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .focusEffectDisabled()
                .scaleEffect(isFocused ? 1.02 : (configuration.isPressed ? 0.98 : 1.0))
                .shadow(
                    color: isFocused ? DesignTokens.Glass.purpleGlow.opacity(0.4) : .clear,
                    radius: isFocused ? 16 : 0,
                    y: isFocused ? 6 : 0
                )
                .animation(.spring(duration: 0.3, bounce: 0.2), value: isFocused)
                .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
        }
    }
#endif
