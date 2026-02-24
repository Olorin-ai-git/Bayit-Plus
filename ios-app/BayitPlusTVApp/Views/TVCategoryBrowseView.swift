#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Fullscreen grid view for browsing all items from a homepage category section.
    /// Presented when the user taps "See All" on a category row.
    /// Fetches ALL content from the API and filters by category name.
    struct TVCategoryBrowseView: View {
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(LocalizationManager.self) private var localization

        let title: String
        let icon: String
        let categoryName: String
        let repository: any ContentRepository

        @State private var items: [ContentItem] = []
        @State private var isLoading = true
        @State private var isLoadingMore = false
        @State private var currentPage = 1
        @State private var hasMore = true
        @State private var error: String?

        private let pageSize = 200
        private let logger = BayitLogger(category: "TVCategoryBrowse")

        private let columns = Array(
            repeating: GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            count: 4
        )

        var body: some View {
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                    header
                    if isLoading && items.isEmpty {
                        loadingGrid
                    } else if let errorMsg = error, items.isEmpty {
                        tvErrorState(errorMsg) {
                            Task { await loadContent() }
                        }
                    } else {
                        itemGrid
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.vertical, TVDesignTokens.Spacing.xl)
            }
            .background(DesignTokens.Background.primary)
            .task { await loadContent() }
        }

        private var header: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.default)

                Text(title.localizedCapitalized)
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
            VStack(spacing: TVDesignTokens.Spacing.focusGap) {
                LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(items) { item in
                        TVContentCard(
                            imageURL: item.thumbnail,
                            title: item.title ?? localization.t("common.untitled"),
                            badge: item.type?.lowercased() == "series"
                                ? localization.t("home.series") : nil,
                            aspectRatio: 2.0 / 3.0,
                            placeholderIcon: "film",
                            availableSubtitleLanguages: item.availableSubtitleLanguages
                        ) {
                            navigateToItem(item)
                        }
                        .onAppear {
                            if item.id == items.last?.id, hasMore {
                                Task { await loadMore() }
                            }
                        }
                    }
                }

                if isLoadingMore {
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                        .scaleEffect(1.2)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, TVDesignTokens.Spacing.xl)
                }
            }
        }

        private var loadingGrid: some View {
            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(0 ..< 8, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster)
                        .fill(DesignTokens.Glass.bg)
                        .aspectRatio(2 / 3, contentMode: .fit)
                }
            }
        }

        // MARK: - Data Loading

        private func loadContent() async {
            isLoading = true
            error = nil
            currentPage = 1

            do {
                let response = try await repository.fetchAllContent(
                    page: currentPage,
                    limit: pageSize
                )
                items = response.items.filter { matchesCategory($0) }
                hasMore = response.page < (response.total / pageSize + 1)
                logger.info("Category browse loaded", context: [
                    "category": categoryName,
                    "matched": String(items.count),
                    "total": String(response.total),
                ])
            } catch {
                self.error = error.userFriendlyMessage
                logger.error("Category browse load failed", error: error)
            }

            isLoading = false
        }

        private func loadMore() async {
            guard !isLoadingMore, hasMore else { return }
            isLoadingMore = true

            let nextPage = currentPage + 1

            do {
                let response = try await repository.fetchAllContent(
                    page: nextPage,
                    limit: pageSize
                )
                let filtered = response.items.filter { matchesCategory($0) }
                items.append(contentsOf: filtered)
                currentPage = nextPage
                hasMore = response.page < (response.total / pageSize + 1)
            } catch {
                logger.error("Category browse load more failed", error: error)
            }

            isLoadingMore = false
        }

        private func matchesCategory(_ item: ContentItem) -> Bool {
            guard let itemCategory = item.category else { return false }
            return itemCategory.caseInsensitiveCompare(categoryName) == .orderedSame
        }

        // MARK: - Navigation

        private func navigateToItem(_ item: ContentItem) {
            let ct = item.type?.lowercased() ?? ""
            if ct == "series" {
                coordinator.fullscreenRoute = .seriesDetail(seriesId: item.id)
            } else if ct == "collection" || item.isCollectionParent == true {
                coordinator.fullscreenRoute = .collectionDetail(
                    collectionId: item.id
                )
            } else if ct == "audiobook" {
                coordinator.fullscreenRoute = .audiobookDetail(audiobookId: item.id)
            } else {
                coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
            }
        }
    }
#endif
