import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS promotional banner for collections with remote focus navigation
struct TVCollectionPromoBannerView: View {
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    let collectionId: String
    let title: String
    let posterUrl: String?
    let promoText: String
    let movieCount: Int

    @FocusState private var isFocused: Bool

    var body: some View {
        Button(action: navigateToCollection) {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                if let posterUrl, let url = URL(string: posterUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            Rectangle().fill(DesignTokens.Glass.bgMedium)
                        }
                    }
                    .frame(width: 200, height: 300)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                }

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "sparkles")
                            .foregroundColor(DesignTokens.Primary.default)
                            .font(.system(size: TVDesignTokens.FontSize.xl))

                        Text(localization.t("vod.collection.aiRecommendation"))
                            .font(.system(
                                size: TVDesignTokens.FontSize.md,
                                weight: .semibold
                            ))
                            .foregroundColor(DesignTokens.Text.muted)
                            .textCase(.uppercase)
                    }

                    Text(title)
                        .font(.system(
                            size: TVDesignTokens.FontSize.xxxl,
                            weight: .bold
                        ))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    Text(promoText)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .lineLimit(4)
                        .lineSpacing(4)

                    Text("\(movieCount) \(localization.t("vod.collection.movies"))")
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.muted)
                        .padding(.top, TVDesignTokens.Spacing.sm)

                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "play.fill")
                        Text(localization.t("vod.collection.watchNow"))
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
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                    .stroke(
                        isFocused ? DesignTokens.Primary.default : DesignTokens.Glass.border,
                        lineWidth: isFocused ? 4 : 2
                    )
            )
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
            .scaleEffect(isFocused ? 1.05 : 1.0)
            .shadow(
                color: isFocused ? DesignTokens.Primary.default.opacity(0.5) : .clear,
                radius: isFocused ? 20 : 0
            )
            .animation(.easeOut(duration: 0.2), value: isFocused)
        }
        .buttonStyle(.plain)
        .focused($isFocused)
    }

    private func navigateToCollection() {
        coordinator.fullscreenRoute = .collectionDetail(collectionId: collectionId)
    }
}
