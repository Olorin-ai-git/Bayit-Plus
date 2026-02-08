import BayitDesignSystem
import SwiftUI

/// Hero section at the top of the home screen with backdrop image and metadata
struct HeroSection: View {
    let hero: HeroContent

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            heroImage

            LinearGradient(
                colors: [.clear, DesignTokens.Background.primary],
                startPoint: .center,
                endPoint: .bottom
            )

            heroMetadata
                .padding(DesignTokens.Spacing.xl)
        }
        .frame(height: 400)
        .clipped()
    }

    private var heroImage: some View {
        Group {
            if let urlString = hero.backdrop ?? hero.thumbnail,
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
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if let title = hero.title {
                Text(title)
                    .font(.system(size: DesignTokens.FontSize.hero, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(2)
            }

            HStack(spacing: DesignTokens.Spacing.md) {
                if let year = hero.year {
                    Text(String(year))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                }

                if let duration = hero.duration {
                    Text(duration)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                }

                if let rating = hero.rating {
                    Text(rating.value)
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .padding(.horizontal, DesignTokens.Spacing.sm)
                        .padding(.vertical, 2)
                        .background(DesignTokens.Glass.bgMedium)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                }
            }

            if let description = hero.description {
                Text(description)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.muted)
                    .lineLimit(2)
            }
        }
    }
}
