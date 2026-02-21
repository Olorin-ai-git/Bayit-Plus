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
            viewModel = PlaylistViewModel(repository: repos.user)
            await viewModel?.load()
            await syncPlaylistWidget()
        }
    }

    private func syncPlaylistWidget() async {
        guard let items = viewModel?.items else { return }
        let contentItems = Array(items.prefix(6)).map { item in
            SharedPlaylistContentItem(
                id: item.contentId,
                contentID: item.contentId,
                title: item.title ?? "",
                thumbnailURL: item.thumbnail.flatMap { URL(string: $0) },
                durationSeconds: parseDurationToSeconds(item.duration),
                contentType: SharedContentType(rawValue: item.contentType ?? "vod") ?? .vod,
                progress: 0
            )
        }
        let sharedItem = SharedPlaylistItem(
            id: "my_playlist",
            name: localization.t("profile.playlist"),
            itemCount: items.count,
            thumbnailURL: items.first.flatMap { URL(string: $0.thumbnail ?? "") },
            items: contentItems
        )
        await widgetSync.syncPlaylists([sharedItem])
    }

    private func parseDurationToSeconds(_ duration: String?) -> Int {
        guard let duration else { return 0 }
        let parts = duration.split(separator: ":").compactMap { Int($0) }
        switch parts.count {
        case 3: return parts[0] * 3600 + parts[1] * 60 + parts[2]
        case 2: return parts[0] * 60 + parts[1]
        case 1: return parts[0]
        default: return 0
        }
    }

    @ViewBuilder
    private var contentBody: some View {
        if let vm = viewModel {
            if vm.isLoading && vm.items.isEmpty {
                ScrollView { PlaylistLoadingList() }
            } else if let error = vm.error, vm.items.isEmpty {
                ScrollView {
                    ErrorStateView(message: error) {
                        Task { await viewModel?.load() }
                    }
                }
            } else if vm.items.isEmpty {
                ScrollView { PlaylistEmptyState() }
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
                PlaylistItemRow(item: item) {
                    let type = ContentType(rawValue: item.contentType ?? "") ?? .movie
                    coordinator.navigate(
                        to: .player(contentId: item.contentId, contentType: type)
                    )
                }
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
}
