import BayitDesignSystem
import SwiftUI

/// tvOS Home screen with hero carousel, continue watching, and content shelves.
/// Reuses HomeViewModel from the shared ViewModels.
struct TVHomeView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: HomeViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.categories.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.categories.isEmpty {
                    tvErrorState(error) {
                        Task { await vm.refresh() }
                    }
                } else {
                    contentSections(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = HomeViewModel(
                    repository: repos.content,
                    liveTVRepository: repos.liveTV,
                    locationProvider: TVLocationProvider()
                )
            }
            await viewModel?.loadFeatured()
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: HomeViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            if !vm.spotlight.isEmpty {
                GlassHeroCarousel(items: vm.spotlight) { item in
                    heroItem(item)
                }
            }

            if !vm.continueWatching.isEmpty {
                GlassContentShelf(title: "Continue Watching", items: vm.continueWatching) { item in
                    GlassFocusPoster(
                        thumbnailURL: item.thumbnail,
                        title: item.title ?? "Untitled",
                        subtitle: item.type
                    )
                }
            }

            if !vm.liveChannels.isEmpty {
                tvLiveChannelsShelf(vm.liveChannels)
            }

            ForEach(vm.categories) { category in
                GlassContentShelf(title: category.name, items: category.items) { item in
                    GlassFocusPoster(
                        thumbnailURL: item.thumbnail,
                        title: item.title ?? "Untitled",
                        badge: item.isSeries == true ? "Series" : nil
                    )
                }
            }
        }
    }

    private func heroItem(_ item: SpotlightItem) -> some View {
        ZStack(alignment: .bottomLeading) {
            if let urlStr = item.thumbnail, let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    if case .success(let img) = phase {
                        img.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        DesignTokens.Glass.purpleLight
                    }
                }
            } else {
                DesignTokens.Glass.purpleLight
            }

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                Text(item.title ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                if let desc = item.description {
                    Text(desc)
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(2)
                }
            }
            .padding(TVDesignTokens.Spacing.xxl)
            .background(
                LinearGradient(
                    colors: [Color.clear, DesignTokens.Glass.bgStrong],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
        }
        .frame(height: TVDesignTokens.MinSize.heroHeight)
    }

    private func tvLiveChannelsShelf(_ channels: [LiveChannelItem]) -> some View {
        GlassContentShelf(title: "Live TV", items: channels) { channel in
            GlassFocusPoster(
                thumbnailURL: channel.logo ?? channel.thumbnail,
                title: channel.name ?? "Channel",
                subtitle: channel.currentShow,
                badge: "LIVE",
                aspectRatio: 16 / 9
            )
        }
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text("Loading...")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}

// MARK: - Shared TV Error State

func tvErrorState(
    _ message: String,
    retry: @escaping () -> Void
) -> some View {
    VStack(spacing: TVDesignTokens.Spacing.xl) {
        Image(systemName: "exclamationmark.triangle")
            .font(.system(size: TVDesignTokens.FontSize.hero))
            .foregroundStyle(DesignTokens.Warning.default)

        Text(message)
            .font(.system(size: TVDesignTokens.FontSize.lg))
            .foregroundStyle(DesignTokens.Text.secondary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: 600)

        GlassButton("Retry", variant: .secondary, size: .large, action: retry)
            .frame(maxWidth: 300)
    }
    .frame(maxWidth: .infinity)
    .padding(.top, TVDesignTokens.Spacing.xxxxl)
}
