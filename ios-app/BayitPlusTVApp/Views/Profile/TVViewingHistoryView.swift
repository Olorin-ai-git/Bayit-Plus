import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Viewing history screen for tvOS - shows what user has watched.
struct TVViewingHistoryView: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(TVRepositoryProvider.self) var repos
    let onDismiss: () -> Void

    @State private var historyItems: [WatchHistoryItem] = []
    @State private var isLoading = true
    @State private var error: String?
    @State private var selectedFilter: HistoryFilter = .all

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    loadingView
                } else if let error {
                    errorView(error)
                } else if historyItems.isEmpty {
                    emptyView
                } else {
                    historyList
                }
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("profile.viewingHistory"))
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(localization.t("common.done")) {
                        onDismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    filterMenu
                }
            }
        }
        .onExitCommand { onDismiss() }
        .task {
            await loadHistory()
        }
    }

    private var filterMenu: some View {
        Menu {
            ForEach(HistoryFilter.allCases, id: \.self) { filter in
                Button(filter.label(localization)) {
                    selectedFilter = filter
                }
            }
        } label: {
            HStack {
                Text(selectedFilter.label(localization))
                Image(systemName: "chevron.down")
            }
        }
    }

    private var historyList: some View {
        List {
            ForEach(filteredItems) { item in
                historyRow(item)
            }
        }
        .listStyle(.grouped)
    }

    var filteredItems: [WatchHistoryItem] {
        switch selectedFilter {
        case .all:
            return historyItems
        case .movies:
            return historyItems.filter { $0.type == "vod" || $0.type == "movie" }
        case .shows:
            return historyItems.filter { $0.type == "series" || $0.type == "episode" }
        case .live:
            return historyItems.filter { $0.type == "live" || $0.type == "channel" }
        }
    }

    // MARK: - Data Loading

    func loadHistory() async {
        isLoading = true
        error = nil

        do {
            let response = try await repos.media.fetchWatchHistory(page: 1, limit: 50)
            historyItems = response.items
        } catch {
            self.error = localization.t("profile.noViewingHistory")
        }

        isLoading = false
    }
}
