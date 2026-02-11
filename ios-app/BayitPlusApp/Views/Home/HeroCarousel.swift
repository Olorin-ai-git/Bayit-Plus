import BayitDesignSystem
import SwiftUI

/// Auto-rotating hero carousel with navigation arrows and Watch Now button
struct HeroCarousel: View {
    let items: [SpotlightItem]
    let coordinator: NavigationCoordinator

    @State private var currentIndex = 0
    @State private var timer: Timer?

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .bottomLeading) {
                // Current hero image (constrained to exact container width)
                if !items.isEmpty {
                    heroImage(items[currentIndex])
                        .frame(width: geometry.size.width, height: geometry.size.height)
                        .clipped()
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

                // Hero metadata and Watch Now button
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    if !items.isEmpty {
                        heroMetadata(items[currentIndex])
                    }

                    // Watch Now button
                    Button {
                        if !items.isEmpty {
                            navigateToItem(items[currentIndex])
                        }
                    } label: {
                        HStack(spacing: DesignTokens.Spacing.xs) {
                            Image(systemName: "play.fill")
                                .font(.system(size: 16))

                            Text("Watch Now")
                                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        }
                        .foregroundColor(.black)
                        .padding(.horizontal, DesignTokens.Spacing.lg)
                        .padding(.vertical, DesignTokens.Spacing.md)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                    }
                }
                .padding(.leading, DesignTokens.Spacing.lg + 4)
                .padding(.trailing, DesignTokens.Spacing.lg)
                .padding(.bottom, DesignTokens.Spacing.lg)
            }
        }
        .frame(height: 320)
        .clipped()
        .onAppear {
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
}
