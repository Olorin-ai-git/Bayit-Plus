import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Standalone continue watching row that loads independently via .task.
/// Shows items with progress bars and time remaining.
/// Hides itself when the user has no in-progress content.
struct TVContinueWatchingRow: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    @State private var items: [WatchHistoryItem] = []
    @State private var hasLoaded = false

    var body: some View {
        Group {
            if hasLoaded && !items.isEmpty {
                TVContentSection(
                    title: localization.t("home.continueWatching"),
                    icon: "play.circle.fill",
                    items: items,
                    maxItems: 8,
                    seeAllAction: { coordinator.selectedTab = .profile }
                ) { item in
                    continueWatchingCard(item)
                }
            }
        }
        .task { await loadData() }
    }

    private func continueWatchingCard(_ item: WatchHistoryItem) -> some View {
        TVContentCard(
            imageURL: item.thumbnail,
            title: item.title ?? localization.t("common.untitled"),
            subtitle: remainingTimeText(item),
            progress: item.progress,
            aspectRatio: 16.0 / 9.0,
            placeholderIcon: "play.circle.fill"
        ) {
            let contentType = TVContentTypeMapper.map(item.type)
            if contentType == .vod {
                coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
            } else {
                coordinator.presentPlayer(
                    contentId: item.id,
                    contentType: contentType
                )
            }
        }
    }

    private func remainingTimeText(_ item: WatchHistoryItem) -> String? {
        guard let duration = item.duration,
              let progress = item.progress,
              duration > 0, progress > 0, progress < 100
        else { return item.type }
        let remainingSeconds = duration * (1.0 - progress / 100.0)
        let remainingMinutes = Int(remainingSeconds / 60)
        guard remainingMinutes > 0 else { return item.type }
        return localization.t(
            "home.minutesRemaining",
            ["minutes": String(remainingMinutes)]
        )
    }

    private func loadData() async {
        do {
            let response = try await repos.media.fetchContinueWatching()
            items = response.items
        } catch {
            items = []
        }
        hasLoaded = true
    }
}

// MARK: - Browse View

/// Full-screen grid browse for Continue Watching.
/// Loaded when the user taps "Continue Watching" from the cinematic home dock.
struct TVContinueWatchingBrowseView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    @State private var items: [WatchHistoryItem] = []
    @State private var isLoading = true
    @State private var error: String?
    @State private var selectedMovieId: String?

    private let columns = Array(
        repeating: GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        count: 4
    )

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                header
                if isLoading {
                    loadingGrid
                } else if let errorMsg = error {
                    tvErrorState(errorMsg) { Task { await loadData() } }
                } else if items.isEmpty {
                    emptyState
                } else {
                    itemGrid
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }
        .background(DesignTokens.Background.primary)
        .onExitCommand { coordinator.dismissFullscreen() }
        .task { await loadData() }
        .fullScreenCover(
            isPresented: Binding(
                get: { selectedMovieId != nil },
                set: { if !$0 { selectedMovieId = nil } }
            )
        ) {
            if let movieId = selectedMovieId {
                TVMovieDetailView(movieId: movieId)
            }
        }
    }

    private var header: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Button { coordinator.dismissFullscreen() } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 48, height: 48)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 1))
            }
            .tvCardStyle()
            Image(systemName: "play.circle.fill")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Primary.default)
            Text(localization.t("home.continueWatching").localizedCapitalized)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
            Text("\(items.count)")
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.bottom, TVDesignTokens.Spacing.md)
    }

    private var itemGrid: some View {
        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(items) { item in
                TVContentCard(
                    imageURL: item.thumbnail,
                    title: item.title ?? localization.t("common.untitled"),
                    subtitle: item.type,
                    progress: item.progress,
                    aspectRatio: 16.0 / 9.0,
                    placeholderIcon: "play.circle.fill"
                ) {
                    let contentType = TVContentTypeMapper.map(item.type)
                    switch contentType {
                    case .vod:
                        selectedMovieId = item.id
                    default:
                        coordinator.presentPlayer(contentId: item.id, contentType: contentType)
                    }
                }
            }
        }
    }

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(0 ..< 8, id: \.self) { _ in
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(16 / 9, contentMode: .fit)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "play.circle")
                .font(.system(size: 72))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("home.noContinueWatching"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func loadData() async {
        isLoading = true
        error = nil
        do {
            let response = try await repos.media.fetchContinueWatching()
            items = response.items
        } catch {
            self.error = error.userFriendlyMessage
        }
        isLoading = false
    }
}
