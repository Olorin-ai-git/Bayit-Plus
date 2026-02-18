import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Auto-rotating hero carousel with navigation arrows and action buttons
struct HeroCarousel: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(RepositoryProvider.self) private var repos
    let items: [SpotlightItem]
    let coordinator: NavigationCoordinator

    @State private var currentIndex = 0
    @State private var timer: Timer?
    @State private var favoritesViewModel: FavoritesViewModel?
    @State private var favoriteStates: [String: Bool] = [:]

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottomLeading) {
                // Current hero image (constrained to exact container width)
                if !items.isEmpty {
                    ZStack(alignment: .topLeading) {
                        heroImage(items[currentIndex])
                            .frame(width: geometry.size.width, height: geometry.size.height)
                            .clipped()

                        // NEW badge on first item
                        if currentIndex == 0 {
                            Text("NEW")
                                .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                                .foregroundStyle(.black)
                                .padding(.horizontal, DesignTokens.Spacing.sm)
                                .padding(.vertical, DesignTokens.Spacing.xs)
                                .background(DesignTokens.Warning.default)
                                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                                .padding(DesignTokens.Spacing.md)
                        }
                    }
                }

                // Gradient overlay for text readability
                LinearGradient(
                    colors: [
                        .clear,
                        DesignTokens.Background.primary.opacity(0.3),
                        DesignTokens.Background.primary.opacity(0.8),
                        DesignTokens.Background.primary
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )

                // Navigation arrows (vertically centered to avoid overlap with bottom metadata)
                HStack {
                    navigationButton(direction: .previous)
                    Spacer()
                    navigationButton(direction: .next)
                }
                .frame(maxHeight: .infinity, alignment: .center)
                .padding(.horizontal, DesignTokens.Spacing.md)

                // Hero metadata and action buttons
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    if !items.isEmpty {
                        heroMetadata(items[currentIndex])
                    }

                    // Action buttons (Watch Now + More Info)
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        // Watch Now button (primary)
                        Button {
                            if !items.isEmpty {
                                navigateToItem(items[currentIndex])
                            }
                        } label: {
                            HStack(spacing: DesignTokens.Spacing.xs) {
                                Image(systemName: "play.fill")
                                    .font(.system(size: 16))

                                Text(localization.t("hero.watch"))
                                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            }
                            .foregroundColor(.black)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, DesignTokens.Spacing.md)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                        }

                        // More Info button (secondary)
                        Button {
                            if !items.isEmpty {
                                navigateToDetailPage(items[currentIndex])
                            }
                        } label: {
                            HStack(spacing: DesignTokens.Spacing.xs) {
                                Image(systemName: "info.circle.fill")
                                    .font(.system(size: 16))

                                Text(localization.t("hero.moreInfo"))
                                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            }
                            .foregroundColor(DesignTokens.Text.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, DesignTokens.Spacing.md)
                            .background(DesignTokens.Glass.bgStrong)
                            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                        }
                    }
                }
                .padding(.leading, DesignTokens.Spacing.lg + 4)
                .padding(.trailing, DesignTokens.Spacing.lg)
                .padding(.bottom, DesignTokens.Spacing.lg)
            }
        }
        .frame(height: UIDevice.current.userInterfaceIdiom == .pad ? 500 : 320)
        .clipped()
        .overlay(alignment: .topTrailing) {
            // Favorites and bookmark actions
            if !items.isEmpty {
                heroActions(items[currentIndex])
            }
        }
        .onAppear {
            if favoritesViewModel == nil {
                favoritesViewModel = FavoritesViewModel(repository: repos.user)
            }
            startAutoRotation()
        }
        .onDisappear {
            stopAutoRotation()
        }
    }

    private func heroImage(_ item: SpotlightItem) -> some View {
        Group {
            if let urlString = item.backdrop ?? item.thumbnail,
               let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        heroPlaceholder
                    }
                }
            } else {
                heroPlaceholder
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
    }

    private var heroPlaceholder: some View {
        LinearGradient(
            colors: [DesignTokens.Glass.purpleLight, DesignTokens.Glass.purpleStrong],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private func heroMetadata(_ item: SpotlightItem) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            if let title = item.title {
                Text(title)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
            }

            HStack(spacing: DesignTokens.Spacing.sm) {
                if let year = item.year {
                    metadataText(String(year))
                }

                if let duration = item.duration {
                    metadataText(duration)
                }

                if let rating = item.rating {
                    ratingBadge(rating.value)
                }
            }

            if let description = item.description {
                Text(description)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .lineLimit(2)
                    .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
            }
        }
    }

    private func metadataText(_ text: String) -> some View {
        Text(text)
            .font(.system(size: DesignTokens.FontSize.sm))
            .foregroundColor(DesignTokens.Text.secondary)
            .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
    }

    private func ratingBadge(_ text: String) -> some View {
        Text(text)
            .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
            .foregroundColor(DesignTokens.Text.primary)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, 3)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }

    private enum NavigationDirection {
        case previous, next
    }

    private func navigationButton(direction: NavigationDirection) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.3)) {
                switch direction {
                case .previous:
                    currentIndex = (currentIndex - 1 + items.count) % items.count
                case .next:
                    currentIndex = (currentIndex + 1) % items.count
                }
            }
            resetAutoRotation()
        } label: {
            Image(systemName: direction == .previous ? "chevron.left" : "chevron.right")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(DesignTokens.Text.primary)
                .frame(width: 40, height: 40)
                .background(DesignTokens.Glass.bgStrong)
                .clipShape(Circle())
        }
    }

    private func navigateToItem(_ item: SpotlightItem) {
        if item.isSeries == true {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else {
            let contentType = ContentType(rawValue: item.type ?? "") ?? .movie
            coordinator.navigate(to: .player(contentId: item.id, contentType: contentType))
        }
    }

    private func navigateToDetailPage(_ item: SpotlightItem) {
        if item.isSeries == true {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }

    private func startAutoRotation() {
        guard items.count > 1 else { return }
        timer = Timer.scheduledTimer(withTimeInterval: 6.0, repeats: true) { _ in
            withAnimation(.easeInOut(duration: 0.3)) {
                currentIndex = (currentIndex + 1) % items.count
            }
        }
    }

    private func stopAutoRotation() {
        timer?.invalidate()
        timer = nil
    }

    private func resetAutoRotation() {
        stopAutoRotation()
        startAutoRotation()
    }

    // MARK: - Hero Actions

    private func heroActions(_ item: SpotlightItem) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            // Favorite star button
            Button {
                Task {
                    if let result = await favoritesViewModel?.toggleFavorite(
                        contentId: item.id,
                        contentType: item.type
                    ) {
                        favoriteStates[item.id] = result
                    }
                }
            } label: {
                Image(systemName: isFavorite(item.id) ? "star.fill" : "star")
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundStyle(isFavorite(item.id) ? DesignTokens.Warning.default : DesignTokens.Text.primary)
                    .frame(width: 36, height: 36)
                    .background(DesignTokens.Glass.bgStrong)
                    .clipShape(Circle())
            }

            // Bookmark/watchlist button
            Button {
                // Bookmark uses same favorite API
                Task {
                    if let result = await favoritesViewModel?.toggleFavorite(
                        contentId: item.id,
                        contentType: item.type
                    ) {
                        favoriteStates[item.id] = result
                    }
                }
            } label: {
                Image(systemName: isFavorite(item.id) ? "bookmark.fill" : "bookmark")
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundStyle(isFavorite(item.id) ? DesignTokens.Primary.p400 : DesignTokens.Text.primary)
                    .frame(width: 36, height: 36)
                    .background(DesignTokens.Glass.bgStrong)
                    .clipShape(Circle())
            }
        }
        .padding(DesignTokens.Spacing.md)
    }

    private func isFavorite(_ contentId: String) -> Bool {
        favoriteStates[contentId] ?? false
    }
}
