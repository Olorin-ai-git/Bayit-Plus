import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Viewing history screen for tvOS - shows what user has watched.
struct TVViewingHistoryView: View {
    @Environment(LocalizationManager.self) var localization
    let onDismiss: () -> Void

    @State private var historyItems: [HistoryItem] = []
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
            .navigationTitle("Viewing History")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        onDismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("All") { selectedFilter = .all }
                        Button("Movies") { selectedFilter = .movies }
                        Button("TV Shows") { selectedFilter = .shows }
                        Button("Live TV") { selectedFilter = .live }
                    } label: {
                        HStack {
                            Text(selectedFilter.rawValue)
                            Image(systemName: "chevron.down")
                        }
                    }
                }
            }
        }
        .onExitCommand { onDismiss() }
        .task {
            await loadHistory()
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

    var filteredItems: [HistoryItem] {
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

        // Simulate loading - replace with real API call
        try? await Task.sleep(for: .seconds(1))

        // Mock data for demonstration
        historyItems = [
            .init(
                id: "1",
                contentId: "c1",
                title: "The Marvelous Mrs. Maisel",
                thumbnail: "https://via.placeholder.com/300x169",
                type: "series",
                year: 2023,
                progress: 0.65,
                watchedAt: Date().addingTimeInterval(-3600)
            ),
            .init(
                id: "2",
                contentId: "c2",
                title: "Shtisel",
                thumbnail: "https://via.placeholder.com/300x169",
                type: "series",
                year: 2021,
                progress: 1.0,
                watchedAt: Date().addingTimeInterval(-7200)
            ),
            .init(
                id: "3",
                contentId: "c3",
                title: "Fauda",
                thumbnail: "https://via.placeholder.com/300x169",
                type: "series",
                year: 2022,
                progress: 0.45,
                watchedAt: Date().addingTimeInterval(-86400)
            ),
        ]

        isLoading = false
    }
}
