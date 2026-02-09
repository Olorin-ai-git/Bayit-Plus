import BayitDesignSystem
import SwiftUI

/// VOD screen showing a paginated grid of movies and series
struct VODView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: VODViewModel?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.items.isEmpty {
                    loadingGrid
                } else if let error = vm.error, vm.items.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await vm.refresh() }
                    }
                } else {
                    contentGrid(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if viewModel == nil {
                viewModel = VODViewModel(repository: repos.content)
            }
            await viewModel?.loadContent()
        }
    }

    private func contentGrid(_ vm: VODViewModel) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(vm.items) { item in
                ZStack(alignment: .topTrailing) {
                    GlassContentCard(
                        thumbnailURL: item.thumbnail,
                        title: item.title,
                        subtitle: vodSubtitle(for: item),
                        badge: item.isSeries == true ? "Series" : nil,
                        subtitleFlags: item.availableSubtitleLanguages?.map { SubtitleLanguages.flag(for: $0) },
                        aspectRatio: 2 / 3,
                        width: .infinity
                    ) {
                        navigateToItem(item)
                    }

                    if let languages = item.availableSubtitleLanguages, !languages.isEmpty {
                        SubtitleFlagsPill(
                            languages: languages,
                            aiLanguages: aiLanguages(for: item),
                            size: .small
                        )
                        .padding(DesignTokens.Spacing.xs)
                    }
                }
                .onAppear {
                    if item.id == vm.items.last?.id {
                        Task { await vm.loadMore() }
                    }
                }
            }

            if vm.isLoadingMore {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0..<9, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(2 / 3, contentMode: .fit)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }

    private func vodSubtitle(for item: ContentItem) -> String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private func aiLanguages(for item: ContentItem) -> Set<String> {
        var aiLangs = Set<String>()
        if item.availableSubtitleLanguages?.contains("he") == true {
            aiLangs.insert("he")
        }
        if item.availableSubtitleLanguages?.contains("en") == true {
            aiLangs.insert("en")
        }
        return aiLangs
    }

    private func navigateToItem(_ item: ContentItem) {
        if item.isSeries == true {
            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
        } else {
            coordinator.navigate(to: .movieDetail(movieId: item.id))
        }
    }
}
