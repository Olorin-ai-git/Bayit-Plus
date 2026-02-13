import BayitCore
import BayitDesignSystem
import SwiftUI

/// Viewing history screen for tvOS - shows what user has watched.
struct TVViewingHistoryView: View {
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

    private func historyRow(_ item: HistoryItem) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            // Thumbnail
            AsyncImage(url: URL(string: item.thumbnail)) { phase in
                if case .success(let image) = phase {
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } else {
                    Rectangle()
                        .fill(DesignTokens.Glass.bgMedium)
                        .overlay(
                            Image(systemName: "film")
                                .font(.system(size: 32))
                                .foregroundStyle(DesignTokens.Text.muted)
                        )
                }
            }
            .frame(width: 160, height: 90)
            .cornerRadius(TVDesignTokens.Radius.md)

            // Info
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(item.title)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    if let year = item.year {
                        Text("\(year)")
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }

                    Text("•")
                        .foregroundStyle(DesignTokens.Text.muted)

                    Text(item.type.capitalized)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                // Progress bar
                if item.progress > 0 {
                    VStack(alignment: .leading, spacing: 4) {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Rectangle()
                                    .fill(Color.white.opacity(0.2))
                                    .frame(height: 4)

                                Rectangle()
                                    .fill(DesignTokens.Primary.p400)
                                    .frame(width: geo.size.width * CGFloat(item.progress), height: 4)
                            }
                        }
                        .frame(height: 4)
                        .cornerRadius(2)

                        Text("\(Int(item.progress * 100))% complete")
                            .font(.system(size: TVDesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
            }

            Spacer()

            // Watched date
            VStack(alignment: .trailing, spacing: 4) {
                Text(item.watchedAt.formatted(.dateTime.month().day()))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Text(item.watchedAt.formatted(.dateTime.hour().minute()))
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .padding(.vertical, TVDesignTokens.Spacing.xs)
    }

    private var filteredItems: [HistoryItem] {
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

    // MARK: - States

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(2.0)

            Text("Loading History...")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)

            Button("Retry") {
                Task { await loadHistory() }
            }
            .buttonStyle(.plain)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgMedium)
            .cornerRadius(TVDesignTokens.Radius.md)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Text.muted)

            Text("No Viewing History")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)

            Text("Start watching content to see your history here")
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Data Loading

    private func loadHistory() async {
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

// MARK: - Models

private struct HistoryItem: Identifiable {
    let id: String
    let contentId: String
    let title: String
    let thumbnail: String
    let type: String
    let year: Int?
    let progress: Double
    let watchedAt: Date
}

private enum HistoryFilter: String {
    case all = "All"
    case movies = "Movies"
    case shows = "TV Shows"
    case live = "Live TV"
}
