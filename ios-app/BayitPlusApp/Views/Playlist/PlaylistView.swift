import BayitAuth
import BayitDesignSystem
import BayitLocalization
import BayitWidgetShared
import SwiftUI

/// Playlist screen displaying the user's curated content list
struct PlaylistView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(AuthManager.self) private var authManager
    @Environment(WidgetDataSyncService.self) private var widgetSync
    @State private var viewModel: PlaylistViewModel?
    @State private var isEditing = false

    var body: some View {
        VStack(spacing: 0) {
            if let vm = viewModel, !vm.items.isEmpty {
                headerBar(vm)
            }

            contentBody
        }
        .background(DesignTokens.Background.primary)
        .task(id: authManager.user?.id) {
            // Reset the viewModel when the signed-in user changes so that
            // a new user never sees a previous user's cached playlist items.
            viewModel = PlaylistViewModel(repository: repos.user)
            await viewModel?.load()
            await syncPlaylistWidget()
        }
    }

    private func syncPlaylistWidget() async {
        guard let items = viewModel?.items else { return }
        let sharedItem = SharedPlaylistItem(
            id: "my_playlist",
            name: localization.t("profile.playlist"),
            itemCount: items.count,
            thumbnailURL: items.first.flatMap { URL(string: $0.thumbnail ?? "") }
        )
        await widgetSync.syncPlaylists([sharedItem])
    }

    @ViewBuilder
    private var contentBody: some View {
        if let vm = viewModel {
            if vm.isLoading && vm.items.isEmpty {
                ScrollView { loadingList }
            } else if let error = vm.error, vm.items.isEmpty {
                ScrollView {
                    ErrorStateView(message: error) {
                        Task { await viewModel?.load() }
                    }
                }
            } else if vm.items.isEmpty {
                ScrollView { emptyState }
            } else {
                playlistList(vm)
            }
        } else {
            ScreenLoadingView()
        }
    }

    private func headerBar(_ vm: PlaylistViewModel) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(
                localization.t("playlist.playAll"),
                variant: .primary,
                size: .small,
                icon: Image(systemName: "play.fill")
            ) {
                if let first = vm.items.first {
                    let type = ContentType(rawValue: first.contentType ?? "") ?? .movie
                    coordinator.navigate(
                        to: .player(contentId: first.contentId, contentType: type)
                    )
                }
            }

            Spacer()

            GlassButton(
                localization.t("playlist.clear"),
                variant: .destructive,
                size: .small,
                icon: Image(systemName: "trash")
            ) {
                Task {
                    await vm.clearAll()
                    await syncPlaylistWidget()
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.sm)
    }

    private func playlistList(_ vm: PlaylistViewModel) -> some View {
        List {
            ForEach(vm.items) { item in
                playlistRow(item, vm: vm)
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(
                        top: DesignTokens.Spacing.xs,
                        leading: DesignTokens.Spacing.lg,
                        bottom: DesignTokens.Spacing.xs,
                        trailing: DesignTokens.Spacing.lg
                    ))
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            Task {
                                await vm.removeItem(contentId: item.contentId)
                                await syncPlaylistWidget()
                            }
                        } label: {
                            Label(
                                localization.t("playlist.removeItem"),
                                systemImage: "trash"
                            )
                        }
                    }
            }
            .onMove { source, destination in
                vm.moveItem(from: source, to: destination)
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .environment(\.editMode, .constant(.active))
        .refreshable {
            await viewModel?.load()
            await syncPlaylistWidget()
        }
    }

    private func playlistRow(
        _ item: PlaylistItem,
        vm: PlaylistViewModel
    ) -> some View {
        Button {
            let type = ContentType(rawValue: item.contentType ?? "") ?? .movie
            coordinator.navigate(
                to: .player(contentId: item.contentId, contentType: type)
            )
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                thumbnailView(item.thumbnail)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(item.title ?? "")
                        .font(.system(
                            size: DesignTokens.FontSize.md,
                            weight: .medium
                        ))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let duration = item.duration {
                        Text(duration)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.secondary)
                    }
                }

                Spacer()
            }
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bg)
            .clipShape(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
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
