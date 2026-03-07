import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// VOD content recommendations based on trending Israeli news topics.
/// Shows position numbers (1, 2, 3...) like a "Top 10" row.
/// Fetches from TrendingRepository.fetchTrendingRecommendations().
struct TVTrendingRecommendationsRow: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    @State private var recommendations: [TrendingContentRecommendation] = []
    @State private var hasLoaded = false

    private let maxItems = 10

    var body: some View {
        Group {
            if hasLoaded && !recommendations.isEmpty {
                trendingSection
            }
        }
        .task { await loadData() }
    }

    private var trendingSection: some View {
        TVContentSection(
            title: localization.t("home.trendingRecommendations"),
            icon: "chart.line.uptrend.xyaxis",
            items: Array(recommendations.prefix(maxItems))
        ) { item in
            trendingCard(item)
        }
    }

    private func trendingCard(
        _ item: TrendingContentRecommendation
    ) -> some View {
        let position = positionFor(item)
        return TVContentCard(
            imageURL: item.thumbnail,
            title: item.title ?? localization.t("common.untitled"),
            subtitle: trendingSubtitle(item, position: position),
            aspectRatio: 2.0 / 3.0,
            placeholderIcon: contentIcon(for: item)
        ) {
            navigateToItem(item)
        }
    }

    private func positionFor(_ item: TrendingContentRecommendation) -> Int {
        guard let index = recommendations.firstIndex(
            where: { $0.id == item.id }
        ) else { return 0 }
        return index + 1
    }

    private func trendingSubtitle(
        _ item: TrendingContentRecommendation,
        position: Int
    ) -> String {
        var parts: [String] = []
        parts.append(
            localization.t(
                "home.topNumber",
                ["position": String(position)]
            )
        )
        if let topic = item.trendingTopic {
            parts.append(topic)
        }
        return parts.joined(separator: " | ")
    }

    private func navigateToItem(_ item: TrendingContentRecommendation) {
        let ct = item.type?.lowercased() ?? ""
        if ct == "series" {
            coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
        } else {
            coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
        }
    }

    private func contentIcon(
        for item: TrendingContentRecommendation
    ) -> String {
        switch item.type?.lowercased() {
        case "series": return "tv.fill"
        default: return "film"
        }
    }

    private func loadData() async {
        do {
            let response = try await repos.trendingRepo
                .fetchTrendingRecommendations(limit: maxItems)
            recommendations = response.recommendations
        } catch {
            recommendations = []
        }
        hasLoaded = true
    }
}
