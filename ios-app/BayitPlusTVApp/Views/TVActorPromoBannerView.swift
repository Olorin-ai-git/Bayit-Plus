import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS promotional banner for an actor with movie poster and actor photo.
/// Layout mirrors TVCollectionPromoBannerView: movie poster on the leading
/// side, actor info with circular photo on the trailing side, glass background.
struct TVActorPromoBannerView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    let actorName: String
    let profileUrl: String?
    let movieCount: Int
    let topMovieThumbnail: String?

    var body: some View {
        Button(action: navigateToActor) {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                moviePoster

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        actorPhoto

                        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                            HStack(spacing: TVDesignTokens.Spacing.sm) {
                                Image(systemName: "person.fill")
                                    .foregroundColor(DesignTokens.Primary.default)
                                    .font(.system(size: TVDesignTokens.FontSize.xl))

                                Text(localization.t("vod.actor.collection"))
                                    .font(.system(
                                        size: TVDesignTokens.FontSize.md,
                                        weight: .semibold
                                    ))
                                    .foregroundColor(DesignTokens.Text.muted)
                                    .textCase(.uppercase)
                            }

                            Text(actorName)
                                .font(.system(
                                    size: TVDesignTokens.FontSize.xxxl,
                                    weight: .bold
                                ))
                                .foregroundColor(DesignTokens.Text.primary)
                                .lineLimit(2)
                        }
                    }

                    Text("\(movieCount) \(localization.t("vod.actor.films"))")
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .padding(.top, TVDesignTokens.Spacing.sm)

                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "film")
                        Text(localization.t("vod.actor.explore"))
                            .font(.system(
                                size: TVDesignTokens.FontSize.lg,
                                weight: .semibold
                            ))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Primary.default)
                    .clipShape(Capsule())
                    .padding(.top, TVDesignTokens.Spacing.md)
                }

                Spacer()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        }
        .buttonStyle(.plain)
        .tvFocusStyle()
    }

    @ViewBuilder
    private var moviePoster: some View {
        if let thumb = topMovieThumbnail, let url = URL(string: thumb) {
            CachedAsyncImage(url: url) { phase in
                switch phase {
                case let .success(image):
                    image.resizable().aspectRatio(contentMode: .fill)
                default:
                    Rectangle().fill(DesignTokens.Glass.bgMedium)
                }
            }
            .frame(width: 200, height: 300)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }

    private var actorPhoto: some View {
        Group {
            if let profileUrl, let url = URL(string: profileUrl) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        Circle().fill(DesignTokens.Glass.bgMedium)
                    }
                }
            } else {
                Circle()
                    .fill(DesignTokens.Glass.bgMedium)
                    .overlay(
                        Image(systemName: "person.fill")
                            .foregroundColor(DesignTokens.Text.muted)
                            .font(.system(size: 32))
                    )
            }
        }
        .frame(width: 80, height: 80)
        .clipShape(Circle())
        .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 2))
    }

    private func navigateToActor() {
        coordinator.fullscreenRoute = .actorDetail(actorName: actorName)
    }
}

/// Auto-rotating carousel of featured actor banners for tvOS.
/// Mirrors TVFeaturedCollectionsCarousel: TabView with .page style,
/// 6-second auto-advance, page indicator dots.
struct TVFeaturedActorsCarousel: View {
    @Environment(LocalizationManager.self) private var localization

    let actors: [ActorListItem]

    @State private var currentIndex = 0

    private static let autoAdvanceSeconds: TimeInterval = 6

    var body: some View {
        if !actors.isEmpty {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                TabView(selection: $currentIndex) {
                    ForEach(Array(actors.enumerated()), id: \.offset) { index, actor in
                        TVActorPromoBannerView(
                            actorName: actor.name,
                            profileUrl: actor.profileUrl,
                            movieCount: actor.movieCount,
                            topMovieThumbnail: actor.topMovieThumbnail
                        )
                        .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .frame(height: 420)

                if actors.count > 1 {
                    HStack(spacing: 8) {
                        ForEach(0 ..< actors.count, id: \.self) { index in
                            Circle()
                                .fill(
                                    index == currentIndex
                                        ? DesignTokens.Primary.default
                                        : DesignTokens.Glass.border
                                )
                                .frame(width: 8, height: 8)
                                .animation(.easeInOut, value: currentIndex)
                        }
                    }
                }
            }
            .task {
                await autoAdvance()
            }
        }
    }

    private func autoAdvance() async {
        guard actors.count > 1 else { return }
        while !Task.isCancelled {
            try? await Task.sleep(
                nanoseconds: UInt64(Self.autoAdvanceSeconds * 1_000_000_000)
            )
            guard !Task.isCancelled else { break }
            withAnimation(.easeInOut) {
                currentIndex = (currentIndex + 1) % actors.count
            }
        }
    }
}
