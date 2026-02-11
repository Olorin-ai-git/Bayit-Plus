import BayitDesignSystem
import BayitMedia
import SwiftUI

/// tvOS VOD screen with content poster grid.
/// Reuses VODViewModel from shared ViewModels.
struct TVVODView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @State private var viewModel: VODViewModel?

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoading && vm.items.isEmpty {
                        loadingGrid
                    } else if let error = vm.error, vm.items.isEmpty {
                        tvErrorState(error) {
                            Task { await vm.refresh() }
                        }
                    } else {
                        contentGrid(vm.items, isLoadingMore: vm.isLoadingMore)
                    }
                }
            }
            .background(DesignTokens.Background.primary)
            .task {
                if viewModel == nil {
                    viewModel = VODViewModel(repository: repos.content)
                }
                await viewModel?.loadContent()
            }
        }
    }

    private func contentGrid(
        _ items: [ContentItem],
        isLoadingMore: Bool
    ) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("Movies & Series")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(items) { item in
                    GlassFocusPoster(
                        thumbnailURL: item.thumbnail,
                        title: item.title ?? "Untitled",
                        subtitle: vodSubtitle(for: item),
                        badge: item.isSeries == true ? "Series" : nil,
                        aspectRatio: 2 / 3,
                        onSelect: {
                            if item.isSeries == true {
                                coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
                            } else {
                                coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
                            }
                        }
                    )
                    .overlay(alignment: .bottomLeading) {
                        if let languages = item.availableSubtitleLanguages,
                           !languages.isEmpty {
                            SubtitleFlagsPill(
                                languages: languages,
                                aiLanguages: [],
                                size: .medium
                            )
                            .padding(TVDesignTokens.Spacing.sm)
                        }
                    }
                    .onAppear {
                        if item.id == items.last?.id {
                            Task { await viewModel?.loadMore() }
                        }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)

            if isLoadingMore {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .scaleEffect(1.2)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, TVDesignTokens.Spacing.xl)
            }
        }
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(0..<10, id: \.self) { _ in
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(2 / 3, contentMode: .fit)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    private func vodSubtitle(for item: ContentItem) -> String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }
}
