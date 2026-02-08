import BayitDesignSystem
import SwiftUI

/// Horizontal scrolling row displaying trending topics, headlines,
/// and AI recommendations using glass-styled cards.
struct TrendingRowView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: TrendingViewModel?

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            if let vm = viewModel, !vm.isLoading {
                topicsSection(vm.topics)
                headlinesSection(vm.headlines)
                recommendationsSection(vm.recommendations)
            } else if viewModel?.isLoading == true {
                loadingPlaceholder
            }

            if let error = viewModel?.error {
                GlassAlert(
                    type: .error,
                    title: "Failed to load trending",
                    message: error
                )
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .task {
            if viewModel == nil {
                viewModel = TrendingViewModel(repository: repos.trendingRepo)
            }
            await viewModel?.loadAll()
        }
    }

    // MARK: - Topics

    @ViewBuilder
    private func topicsSection(_ topics: [TrendingTopic]) -> some View {
        if !topics.isEmpty {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                sectionHeader(title: "Trending Topics", icon: "chart.line.uptrend.xyaxis")

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        ForEach(topics) { topic in
                            topicCard(topic)
                        }
                    }
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                }
            }
        }
    }

    private func topicCard(_ topic: TrendingTopic) -> some View {
        GlassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                if let category = topic.category {
                    GlassBadge(text: category, variant: .info)
                }

                Text(topic.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(2)

                if let score = topic.score {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Image(systemName: "flame.fill")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Warning.default)
                            .accessibilityHidden(true)

                        Text(String(format: "%.0f", score))
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
            }
        }
        .frame(width: 180)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Trending: \(topic.title ?? "")")
    }

    // MARK: - Headlines

    @ViewBuilder
    private func headlinesSection(_ headlines: [TrendingHeadline]) -> some View {
        if !headlines.isEmpty {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                sectionHeader(title: "Headlines", icon: "newspaper")

                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: DesignTokens.Spacing.md) {
                        ForEach(headlines, id: \.stableId) { headline in
                            headlineCard(headline)
                        }
                    }
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                }
            }
        }
    }

    private func headlineCard(_ headline: TrendingHeadline) -> some View {
        GlassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.md) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(headline.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(3)

                HStack {
                    if let source = headline.source {
                        Text(source)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                    Spacer()
                    if let timestamp = headline.timestamp {
                        Text(timestamp)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
            }
        }
        .frame(width: 260)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(headline.title ?? "Headline")
    }

    // MARK: - Recommendations

    @ViewBuilder
    private func recommendationsSection(_ items: [ContentItem]) -> some View {
        if !items.isEmpty {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                sectionHeader(title: "Recommended for You", icon: "sparkles")

                GlassCarousel(items: items, itemWidth: 160) { item in
                    GlassContentCard(
                        thumbnailURL: item.thumbnail,
                        title: item.title,
                        subtitle: item.category,
                        aspectRatio: 2 / 3,
                        width: 160
                    ) {
                        navigateToItem(item)
                    }
                }
            }
        }
    }

    // MARK: - Shared

    private func sectionHeader(title: String, icon: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Primary.p400)
                .accessibilityHidden(true)

            Text(title)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var loadingPlaceholder: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ForEach(0..<2, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 100)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .accessibilityHidden(true)
    }

    private func navigateToItem(_ item: ContentItem) {
        if item.isSeries == true {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }
}
