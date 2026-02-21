import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Hero Actions and Auto-Rotation

extension HeroCarousel {
    func heroActions(_ item: SpotlightItem) -> some View {
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

    func isFavorite(_ contentId: String) -> Bool {
        favoriteStates[contentId] ?? false
    }

    func startAutoRotation() {
        guard items.count > 1 else { return }
        timer = Timer.scheduledTimer(withTimeInterval: 6.0, repeats: true) { _ in
            withAnimation(.easeInOut(duration: 0.3)) {
                currentIndex = (currentIndex + 1) % items.count
            }
        }
    }

    func stopAutoRotation() {
        timer?.invalidate()
        timer = nil
    }

    func resetAutoRotation() {
        stopAutoRotation()
        startAutoRotation()
    }
}
