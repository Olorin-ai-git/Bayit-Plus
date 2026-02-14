import BayitDesignSystem
import SwiftUI

/// Promotional banner for movie collections with AI-generated text
/// Features:
/// - Glass design with poster thumbnail
/// - Fade-in animation
/// - Call-to-action button
/// - Localized content
struct CollectionPromoBannerView: View {
    @Environment(NavigationCoordinator.self) private var coordinator

    let collectionId: String
    let title: String
    let posterUrl: String?
    let promoText: String
    let movieCount: Int

    @State private var isVisible = false

    var body: some View {
        Button(action: navigateToCollection) {
            HStack(spacing: DesignTokens.Spacing.md) {
                if let posterUrl, let url = URL(string: posterUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            Rectangle().fill(DesignTokens.Glass.bgMedium)
                        }
                    }
                    .frame(width: 100, height: 150)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                }

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Image(systemName: "sparkles")
                            .foregroundColor(DesignTokens.Primary.default)
                            .font(.system(size: 16))

                        Text("AI Recommendation")
                            .font(.system(
                                size: DesignTokens.FontSize.xs,
                                weight: .semibold
                            ))
                            .foregroundColor(DesignTokens.Text.muted)
                            .textCase(.uppercase)
                    }

                    Text(title)
                        .font(.system(
                            size: DesignTokens.FontSize.lg,
                            weight: .bold
                        ))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    Text(promoText)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .lineLimit(3)
                        .lineSpacing(2)

                    Text("\(movieCount) movies")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)

                    Text("Watch Now")
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

    private func navigateToCollection() {
        coordinator.navigate(to: .collectionDetail(collectionId: collectionId))
    }
}
