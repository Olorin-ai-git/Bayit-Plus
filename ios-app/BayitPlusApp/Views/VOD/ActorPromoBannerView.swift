import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Promotional banner for an actor featuring circular photo, name, and movie count.
struct ActorPromoBannerView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    let actorName: String
    let profileUrl: String?
    let movieCount: Int

    @State private var isVisible = false

    var body: some View {
        Button(action: navigateToActor) {
            HStack(spacing: DesignTokens.Spacing.md) {
                actorPhoto

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Image(systemName: "person.fill")
                            .foregroundColor(DesignTokens.Primary.default)
                            .font(.system(size: 16))

                        Text(localization.t("vod.actor.collection"))
                            .font(.system(
                                size: DesignTokens.FontSize.xs,
                                weight: .semibold
                            ))
                            .foregroundColor(DesignTokens.Text.muted)
                            .textCase(.uppercase)
                    }

                    Text(actorName)
                        .font(.system(
                            size: DesignTokens.FontSize.lg,
                            weight: .bold
                        ))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    Text("\(movieCount) \(localization.t("vod.actor.films"))")
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)

                    Text(localization.t("vod.actor.explore"))
                        .font(.system(
                            size: DesignTokens.FontSize.sm,
                            weight: .semibold
                        ))
                        .foregroundColor(.white)
                        .padding(.horizontal, DesignTokens.Spacing.md)
                        .padding(.vertical, DesignTokens.Spacing.sm)
                        .background(DesignTokens.Primary.default)
                        .clipShape(Capsule())
                        .padding(.top, DesignTokens.Spacing.xs)
                }

                Spacer()
            }
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgMedium)
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            .opacity(isVisible ? 1 : 0)
            .scaleEffect(isVisible ? 1 : 0.95)
            .animation(.easeOut(duration: 0.6), value: isVisible)
        }
        .buttonStyle(.plain)
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                isVisible = true
            }
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
                            .font(.system(size: 28))
                    )
            }
        }
        .frame(width: 80, height: 80)
        .clipShape(Circle())
        .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 1))
    }

    private func navigateToActor() {
        coordinator.navigate(to: .actorDetail(actorName: actorName))
    }
}

/// Auto-rotating carousel of featured actor banners.
struct FeaturedActorsCarousel: View {
    @Environment(LocalizationManager.self) private var localization

    let actors: [ActorListItem]

    @State private var currentIndex = 0

    private static let autoAdvanceSeconds: TimeInterval = 5

    var body: some View {
        if !actors.isEmpty {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("vod.actor.featuredActors"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                TabView(selection: $currentIndex) {
                    ForEach(Array(actors.enumerated()), id: \.offset) { index, actor in
                        ActorPromoBannerView(
                            actorName: actor.name,
                            profileUrl: actor.profileUrl,
                            movieCount: actor.movieCount
                        )
                        .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .frame(height: 140)

                if actors.count > 1 {
                    HStack(spacing: 6) {
                        ForEach(0 ..< actors.count, id: \.self) { index in
                            Circle()
                                .fill(
                                    index == currentIndex
                                        ? DesignTokens.Primary.default
                                        : DesignTokens.Glass.border
                                )
                                .frame(width: 6, height: 6)
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
