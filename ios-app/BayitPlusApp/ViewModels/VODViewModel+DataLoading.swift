import Foundation

// MARK: - VOD Data Loading (Pagination & Refresh)

extension VODViewModel {
    @MainActor
    func loadMore() async {
        guard !isLoadingMore, hasMore else { return }
        isLoadingMore = true

        let nextPage = currentPage + 1

        do {
            if selectedType == .collections {
                let collections = try await repository.fetchCollections(
                    skip: items.count,
                    limit: pageSize
                )
                let mapped = collections.map { $0.toContentItem() }
                items.append(contentsOf: mapped)
                currentPage = nextPage
                hasMore = collections.count >= pageSize
            } else {
                let response: ContentListResponse
                if selectedType == .series {
                    response = try await repository.fetchSeries(
                        page: nextPage,
                        limit: pageSize
                    )
                } else {
                    response = try await repository.fetchAllContent(
                        page: nextPage,
                        limit: pageSize
                    )
                }
                let filteredItems = selectedType == .all
                    ? response.items
                    : filterItemsByType(response.items)
                items.append(contentsOf: filteredItems)
                currentPage = nextPage
                hasMore = response.page < (response.total / pageSize + 1)
            }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoadingMore = false
    }

    @MainActor
    func refresh() async {
        error = nil
        currentPage = 1
        isLoading = true

        do {
            if selectedType == .collections {
                let collections = try await repository.fetchCollections(
                    skip: 0,
                    limit: pageSize
                )
                let mapped = collections.map { $0.toContentItem() }
                items = mapped
                hasMore = collections.count >= pageSize
            } else {
                let response: ContentListResponse
                if selectedType == .series {
                    response = try await repository.fetchSeries(
                        page: 1,
                        limit: pageSize
                    )
                } else {
                    response = try await repository.fetchAllContent(
                        page: 1,
                        limit: pageSize
                    )
                }
                items = selectedType == .all
                    ? response.items
                    : filterItemsByType(response.items)
                hasMore = response.page < (response.total / pageSize + 1)
            }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    func filterItemsByType(_ items: [ContentItem]) -> [ContentItem] {
        switch selectedType {
        case .all:
            return items
        case .movies:
            return items.filter { $0.type == "movie" }
        case .series:
            return items.filter { $0.type?.lowercased() == "series" }
        case .collections:
            return items.filter { $0.isCollectionParent == true }
        }
    }
}
