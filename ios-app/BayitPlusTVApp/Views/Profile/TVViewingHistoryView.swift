import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
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
        VStack(spacing: 0) {
            HStack {
                Spacer()
                filterPicker
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.sm)

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
        }
        .task { await loadHistory() }
    }

    private var filterPicker: some View {
        Menu {
            ForEach(HistoryFilter.allCases, id: \.self) { filter in
                Button(filter.label(localization)) {
                    selectedFilter = filter
                }
            }
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Text(selectedFilter.label(localization))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                Image(systemName: "line.3.horizontal.decrease")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
            }
            .foregroundStyle(DesignTokens.Text.secondary)
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(Capsule())
        }
    }

    private var historyList: some View {
        ScrollView {
            LazyVStack(spacing: TVDesignTokens.Spacing.sm) {
                ForEach(filteredItems) { item in
                    historyRow(item)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }
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
            let response = try await repos.media.fetchWatchHistory(page: 1, limit: 20)
            historyItems = response.items
        } catch {
            if let apiError = error as? APIError {
                switch apiError {
                case .notFound, .unknown(statusCode: 422, _):
                    historyItems = []
                default:
                    if let message = (error as Error).userFriendlyMessage {
                        self.error = message
                    }
                }
            } else if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }
}
