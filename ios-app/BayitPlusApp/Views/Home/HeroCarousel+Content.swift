import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Hero Content, Metadata and Navigation

extension HeroCarousel {
    func heroImage(_ item: SpotlightItem) -> some View {
        Group {
            if let urlString = item.backdrop ?? item.thumbnail,
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
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
    }

    var heroPlaceholder: some View {
        LinearGradient(
            colors: [DesignTokens.Glass.purpleLight, DesignTokens.Glass.purpleStrong],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    func heroMetadata(_ item: SpotlightItem) -> some View {
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

    func metadataText(_ text: String) -> some View {
        Text(text)
            .font(.system(size: DesignTokens.FontSize.sm))
            .foregroundColor(DesignTokens.Text.secondary)
            .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 1)
    }

    func ratingBadge(_ text: String) -> some View {
        Text(text)
            .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
            .foregroundColor(DesignTokens.Text.primary)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, 3)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }

    func navigationButton(direction: NavigationDirection) -> some View {
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

    func navigateToItem(_ item: SpotlightItem) {
        let ct = item.type?.lowercased() ?? ""
        if ct == "series" {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else if ct == "collection" {
            coordinator.navigate(to: .collectionDetail(collectionId: item.id))
        } else if ct == "audiobook" {
            coordinator.navigate(to: .audiobookDetail(audiobookId: item.id))
        } else {
            let contentType = ContentType(rawValue: item.type ?? "") ?? .movie
            coordinator.navigate(to: .player(contentId: item.id, contentType: contentType))
        }
    }

    func navigateToDetailPage(_ item: SpotlightItem) {
        let ct = item.type?.lowercased() ?? ""
        if ct == "series" {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else if ct == "collection" {
            coordinator.navigate(to: .collectionDetail(collectionId: item.id))
        } else if ct == "audiobook" {
            coordinator.navigate(to: .audiobookDetail(audiobookId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }
}
