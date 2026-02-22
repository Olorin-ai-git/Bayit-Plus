import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Auto-rotating hero carousel with navigation arrows and action buttons
struct HeroCarousel: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(RepositoryProvider.self) private var repos
    let items: [SpotlightItem]
    let coordinator: NavigationCoordinator

    @State var currentIndex = 0
    @State var rotationEpoch = 0
    @State var favoritesViewModel: FavoritesViewModel?
    @State var favoriteStates: [String: Bool] = [:]

    enum NavigationDirection {
        case previous, next
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottomLeading) {
                // Current hero image (constrained to exact container width)
                if !items.isEmpty {
                    ZStack(alignment: .topLeading) {
                        heroImage(items[currentIndex])
                            .id(items[currentIndex].id)
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
                        DesignTokens.Background.primary,
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )

                // Navigation arrows
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

                    actionButtons
                }
                .padding(.leading, DesignTokens.Spacing.lg + 4)
                .padding(.trailing, DesignTokens.Spacing.lg)
                .padding(.bottom, DesignTokens.Spacing.lg)
            }
        }
        .frame(height: UIDevice.current.userInterfaceIdiom == .pad ? 500 : 320)
        .clipped()
        .overlay(alignment: .topTrailing) {
            if !items.isEmpty {
                heroActions(items[currentIndex])
            }
        }
        .onAppear {
            if favoritesViewModel == nil {
                favoritesViewModel = FavoritesViewModel(repository: repos.user)
            }
        }
        .task(id: rotationEpoch) {
            guard items.count > 1 else { return }
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(6))
                guard !Task.isCancelled else { break }
                withAnimation(.easeInOut(duration: 0.6)) {
                    currentIndex = (currentIndex + 1) % items.count
                }
            }
        }
    }

    // MARK: - Action Buttons

    var actionButtons: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
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
            .buttonStyle(.plain)

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
            .buttonStyle(.plain)
        }
    }
}
