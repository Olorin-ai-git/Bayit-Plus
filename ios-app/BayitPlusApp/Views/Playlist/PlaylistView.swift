import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Playlist screen displaying the user's curated content list
struct PlaylistView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: PlaylistViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.items.isEmpty {
                    loadingList
                } else if let error = vm.error, vm.items.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await viewModel?.load() }
                    }
                } else if vm.items.isEmpty {
                    emptyState
                } else {
                    contentList(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.load()
        }
        .task {
            if viewModel == nil {
                viewModel = PlaylistViewModel(repository: repos.user)
            }
            await viewModel?.load()
        }
    }

    private func contentList(_ vm: PlaylistViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(vm.items) { item in
                playlistRow(item, vm: vm)
            }

            if vm.items.count < vm.total {
                Color.clear
                    .frame(height: 1)
                    .onAppear {
                        Task { await vm.loadMore() }
                    }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private func playlistRow(_ item: PlaylistItem, vm: PlaylistViewModel) -> some View {
        GlassCard {
            Button {
                if let contentId = item.contentId {
                    coordinator.pushToCurrentTab(
                        .movieDetail(movieId: contentId)
                    )
                }
            } label: {
                HStack(spacing: DesignTokens.Spacing.md) {
                    thumbnailView(item.thumbnail)

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        Text(item.title ?? "")
                            .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                            .foregroundColor(DesignTokens.Text.primary)
                            .lineLimit(2)

                        if let duration = item.duration {
                            Text(duration)
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundColor(DesignTokens.Text.secondary)
                        }
                    }

                    Spacer()

                    Image(systemName: "line.3.horizontal")
                        .foregroundColor(DesignTokens.Text.muted)
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
        .contextMenu {
            Button(role: .destructive) {
                Task {
                    await vm.removeItem(
                        contentId: item.contentId ?? item.id
                    )
                }
            } label: {
                Label(
                    localization.t("playlist.remove"),
                    systemImage: "trash"
                )
            }
        }
    }

    private func thumbnailView(_ url: String?) -> some View {
        Group {
            if let urlStr = url, let imageURL = URL(string: urlStr) {
                AsyncImage(url: imageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        thumbnailPlaceholder
                    }
                }
            } else {
                thumbnailPlaceholder
            }
        }
        .frame(width: 100, height: 56)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }

    private var thumbnailPlaceholder: some View {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            .fill(DesignTokens.Glass.bg)
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "list.bullet")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Text.muted)

            Text(localization.t("playlist.empty"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 120)
    }

    private var loadingList: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(0..<5, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 80)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}
