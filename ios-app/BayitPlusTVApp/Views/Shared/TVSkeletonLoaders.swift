import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Skeleton loading card for tvOS content while data loads.
/// Displays a shimmer effect placeholder matching content card dimensions.
struct TVSkeletonCard: View {
    let width: CGFloat
    let height: CGFloat

    @State private var isAnimating = false

    var body: some View {
        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
            .fill(
                LinearGradient(
                    colors: [
                        DesignTokens.Glass.bgLight,
                        DesignTokens.Glass.bg,
                        DesignTokens.Glass.bgLight,
                    ],
                    startPoint: isAnimating ? .leading : .trailing,
                    endPoint: isAnimating ? .trailing : .leading
                )
            )
            .frame(width: width, height: height)
            .onAppear {
                withAnimation(
                    .easeInOut(duration: 1.5)
                        .repeatForever(autoreverses: true)
                ) {
                    isAnimating = true
                }
            }
    }
}

/// Horizontal row of skeleton cards for content shelves.
struct TVSkeletonShelf: View {
    let title: String
    let cardCount: Int = 4
    let cardWidth: CGFloat = 360
    let cardHeight: CGFloat = 240

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    ForEach(0 ..< cardCount, id: \.self) { index in
                        TVSkeletonCard(width: cardWidth, height: cardHeight)
                            .opacity(0.6 - (Double(index) * 0.1))
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
        }
    }
}

/// Skeleton state showing multiple loading shelves.
struct TVSkeletonHomeView: View {
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xxl) {
            TVSkeletonShelf(title: localization.t("tvos.home.continueWatching"))
            TVSkeletonShelf(title: localization.t("tvos.home.liveTV"))
            TVSkeletonShelf(title: localization.t("tvos.home.trendingNow"))
        }
        .padding(.top, TVDesignTokens.Spacing.xl)
    }
}
