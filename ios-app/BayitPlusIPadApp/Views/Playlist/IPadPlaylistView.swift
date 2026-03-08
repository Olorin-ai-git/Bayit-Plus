import BayitAuth
import BayitDesignSystem
import BayitLocalization
import BayitWidgetShared
import SwiftUI

/// iPad-optimized playlist with wider layout and action bar
struct IPadPlaylistView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(AuthManager.self) private var authManager
    @Environment(WidgetDataSyncService.self) private var widgetSync
    @State private var viewModel: PlaylistViewModel?

    var body: some View {
        VStack(spacing: 0) {
            PageHeader(icon: "music.note.list", title: localization.t("common.playlist"))

            if let vm = viewModel, !vm.items.isEmpty {
                actionBar(vm)
            }

            if let vm = viewModel {
                if vm.isLoading && vm.items.isEmpty {
                    ScrollView { PlaylistLoadingList() }
                } else if let error = vm.error, vm.items.isEmpty {
                    ScrollView { ErrorStateView(message: error) { Task { await viewModel?.load() } } }
                } else if vm.items.isEmpty {
                    ScrollView { PlaylistEmptyState() }
                } else {
                    playlistContent(vm)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .task(id: authManager.user?.id) {
            viewModel = PlaylistViewModel(repository: repos.user)
            await viewModel?.load()
        }
    }

    private func actionBar(_ vm: PlaylistViewModel) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(
                localization.t("playlist.playAll"),
                variant: .primary,
                size: .small,
                icon: Image(systemName: "play.fill")
            ) {
                if let first = vm.items.first {
                    let type = ContentType(rawValue: first.contentType ?? "") ?? .movie
                    coordinator.navigate(to: .player(contentId: first.contentId, contentType: type))
                }
            }
            Spacer()
            GlassButton(
                localization.t("playlist.clear"),
                variant: .destructive,
                size: .small,
                icon: Image(systemName: "trash")
            ) {
                Task { await vm.clearAll() }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.vertical, DesignTokens.Spacing.sm)
    }

    private func playlistContent(_ vm: PlaylistViewModel) -> some View {
        List {
            ForEach(vm.items) { item in
                PlaylistItemRow(item: item) {
                    let type = ContentType(rawValue: item.contentType ?? "") ?? .movie
                    coordinator.navigate(to: .player(contentId: item.contentId, contentType: type))
                }
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(
                    top: DesignTokens.Spacing.xs,
                    leading: DesignTokens.Spacing.xl,
                    bottom: DesignTokens.Spacing.xs,
                    trailing: DesignTokens.Spacing.xl
                ))
                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                    Button(role: .destructive) {
                        Task { await vm.removeItem(contentId: item.contentId) }
                    } label: {
                        Label(localization.t("playlist.removeItem"), systemImage: "trash")
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
        .refreshable { await viewModel?.load() }
    }
}
