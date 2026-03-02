import Foundation

// MARK: - VOD Filtering, Pagination, and Refresh

extension VODViewModel {
    // MARK: - Load More

    @MainActor
    func loadMore() async {
        guard !isLoadingMore, hasMore else { return }
        isLoadingMore = true

        let nextPage = currentPage + 1

        do {
            if selectedType == .actors {
                let actors = try await actorRepository.fetchActors(
                    skip: items.count,
                    limit: pageSize
                )
                let mapped = actors.map { $0.toContentItem() }
                items.append(contentsOf: mapped)
                currentPage = nextPage
                hasMore = actors.count >= pageSize
            } else if selectedType == .collections {
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

    // MARK: - Refresh

    @MainActor
    func refresh() async {
        error = nil
        currentPage = 1
        isLoading = true

        do {
            if selectedType == .actors {
                let actors = try await actorRepository.fetchActors(
                    skip: 0,
                    limit: pageSize
                )
                let mapped = actors.map { $0.toContentItem() }
                items = mapped
                hasMore = actors.count >= pageSize
            } else if selectedType == .collections {
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

    // MARK: - Filtering

    func filterItems(_ items: [ContentItem]) -> [ContentItem] {
        var filtered = items

        switch selectedType {
        case .all:
            break
        case .movies:
            filtered = filtered.filter { $0.type == "movie" }
        case .series:
            filtered = filtered.filter { $0.type?.lowercased() == "series" }
        case .collections:
            filtered = filtered.filter { $0.isCollectionParent == true }
        case .actors:
            filtered = filtered.filter { $0.type == "actor" }
        }

        if let categoryId = selectedCategory,
           let categoryName = categories.first(where: { $0.id == categoryId })?.name
        {
            filtered = filtered.filter { $0.category == categoryName }
        }

        if let genre = selectedGenre {
            filtered = filtered.filter { item in
                guard let itemGenre = item.genre else { return false }
                return itemGenre.localizedCaseInsensitiveContains(genre)
            }
        }

        return filtered
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
        case .actors:
            return items.filter { $0.type == "actor" }
        }
    }
}
