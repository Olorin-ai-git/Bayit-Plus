import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Trending culture news row (What's Hot in Israel)
/// Displays news topic cards matching the web CultureTrendingRow design.
/// Card component extracted to TrendingCard.swift.
struct TrendingRow: View {
    @Environment(LocalizationManager.self) private var localization
    let items: [CultureTrendingItem]
    let coordinator: NavigationCoordinator

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .topLeading) {
                Image("Masada")
                    .resizable()
                    .scaledToFill()
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()

                LinearGradient(
                    stops: [
                        .init(color: .black.opacity(0.5), location: 0),
                        .init(color: .black.opacity(0.2), location: 0.3),
                        .init(color: .black.opacity(0.4), location: 0.6),
                        .init(color: .black.opacity(0.75), location: 1.0),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    header
                    topicsCarousel
                    sourcesFooter
                }
                .padding(.vertical, DesignTokens.Spacing.md)
            }
        }
        .frame(height: 340)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.xl)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
        .padding(.horizontal, DesignTokens.Spacing.md)
    }

    private var header: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Text(localizedTitle)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(.white)
                .shadow(color: .black.opacity(0.6), radius: 3, x: 0, y: 1)

            Image(systemName: "flame.fill")
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundColor(.orange)
                .shadow(color: .black.opacity(0.5), radius: 2, x: 0, y: 1)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var topicsCarousel: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: DesignTokens.Spacing.md) {
                ForEach(items) { item in
                    Button {
                        if let urlString = item.url, let url = URL(string: urlString) {
                            UIApplication.shared.open(url)
                        }
                    } label: {
                        TrendingCard(item: item)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private var sourcesFooter: some View {
        let sources = uniqueSources
        return Group {
            if !sources.isEmpty {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Text(localization.t("trending.sources"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)

                    Text(sources.joined(separator: ", "))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)
                        .lineLimit(1)
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    private var localizedTitle: String {
        let lang = Locale.current.language.languageCode?.identifier ?? "en"
        switch lang {
        case "he": return "\u{05DE}\u{05D4} \u{05D7}\u{05DD} \u{05D1}\u{05D9}\u{05E9}\u{05E8}\u{05D0}\u{05DC}"
        case "es": return "Lo popular en Israel"
        default: return "What's Hot in Israel"
        }
    }

    private var uniqueSources: [String] {
        let allSources = items.compactMap(\.sourceName)
        return Array(Set(allSources)).sorted()
    }
}
