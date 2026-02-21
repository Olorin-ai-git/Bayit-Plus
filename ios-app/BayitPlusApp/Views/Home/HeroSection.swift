import BayitDesignSystem
import SwiftUI

/// Hero section at the top of the home screen with backdrop image and metadata
struct HeroSection: View {
    let hero: HeroContent

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            heroImage

            // Stronger gradient for better text readability
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

            heroMetadata
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.bottom, DesignTokens.Spacing.lg)
        }
        .frame(height: 320) // Reduced from 400 for better mobile UX
        .clipped()
    }

    private var heroImage: some View {
        Group {
            if let urlString = hero.backdrop ?? hero.thumbnail,
               let url = URL(string: urlString)
            {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        heroPlaceholder
                    }
                }
            } else {
                heroPlaceholder
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var heroPlaceholder: some View {
        LinearGradient(
            colors: [DesignTokens.Glass.purpleLight, DesignTokens.Glass.purpleStrong],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private var heroMetadata: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            if let title = hero.title {
                Text(title)
                    .font(.system(size: 28, weight: .bold)) // Smaller than hero size for mobile
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
            }

            HStack(spacing: DesignTokens.Spacing.sm) {
                if let year = hero.year {
                    metadataText(String(year))
                }

                if let duration = hero.duration {
                    metadataText(duration)
                }

                if let rating = hero.rating {
                    ratingBadge(rating.value)
                }
            }

            if let description = hero.description {
                Text(description)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .lineLimit(3)
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
}
