import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Listen screen with radio stations, category filters and podcast show grid
struct PodcastsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: PodcastsViewModel?
    @State private var radioStations: [RadioStationItem] = []
    @State private var showAddSheet = false

    let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            HStack {
                PageHeader(icon: "headphones", title: localization.t("listen.title"))
                Button {
                    showAddSheet = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignTokens.Primary.default)
                }
                .padding(.trailing, DesignTokens.Spacing.lg)
            }

            if let vm = viewModel {
                if vm.isLoading && vm.shows.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.shows.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await vm.refresh() }
                    }
                } else {
                    contentView(vm)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
        .sheet(isPresented: $showAddSheet) {
            AddPodcastView(
                repository: repos.podcasts,
                onDismiss: { showAddSheet = false },
                onAdded: {
                    showAddSheet = false
                    Task { await viewModel?.refresh() }
                }
            )
        }
        .task {
            if viewModel == nil {
                viewModel = PodcastsViewModel(repository: repos.podcasts)
            }
            await viewModel?.loadInitial()
            await loadRadioStations()
        }
    }

    private func contentView(_ vm: PodcastsViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            if !radioStations.isEmpty {
                RadioStationsRow(stations: radioStations)
            }

            Text(localization.t("podcasts.title"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            if !vm.categories.isEmpty {
                categoryFilters(vm)
            }

            showGrid(vm)
        }
    }

    private func loadRadioStations() async {
        do {
            let response = try await repos.radio.fetchStations(cultureId: nil, genre: nil)
            radioStations = Array(response.stations.prefix(8))
        } catch {
            radioStations = []
        }
    }

    // categoryFilters and showGrid are defined in PodcastsBrowseSection.swift extension.

    private var loadingState: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0 ..< 6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(1, contentMode: .fit)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
    }
}
