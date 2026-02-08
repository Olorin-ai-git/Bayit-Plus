import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main friends screen showing pending requests, friends list with search, and empty state.
struct FriendsView: View {
    @State private var viewModel: FriendsViewModel
    @Environment(\.localizationManager) private var localization

    init(repository: any FriendsRepository) {
        _viewModel = State(initialValue: FriendsViewModel(repository: repository))
    }

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            if viewModel.isLoading && viewModel.friends.isEmpty {
                ProgressView()
                    .tint(DesignTokens.Text.secondary)
            } else if let error = viewModel.error, viewModel.friends.isEmpty {
                ErrorStateView(message: error, onRetry: { Task { await viewModel.loadAll() } })
            } else {
                contentView
            }
        }
        .navigationTitle(localization?.t("friends.title") ?? "Friends")
        .task { await viewModel.loadAll() }
    }

    // MARK: - Content

    @ViewBuilder
    private var contentView: some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.lg) {
                searchField
                requestsSection
                friendsListSection
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
            .padding(.vertical, DesignTokens.Spacing.md)
        }
        .refreshable { await viewModel.loadAll() }
    }

    // MARK: - Search

    private var searchField: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            GlassTextField(
                localization?.t("friends.searchPlaceholder") ?? "Search users...",
                text: $viewModel.searchQuery
            )
            .accessibilityLabel("Search for users")

            if !viewModel.searchQuery.isEmpty {
                GlassButton(
                    localization?.t("friends.search") ?? "Search",
                    variant: .primary,
                    size: .small,
                    isDisabled: viewModel.isSearching,
                    action: { Task { await viewModel.searchUsers() } }
                )
                .accessibilityLabel("Search")
            }
        }
    }

    // MARK: - Requests Section

    @ViewBuilder
    private var requestsSection: some View {
        if !viewModel.incomingRequests.isEmpty {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                sectionHeader(localization?.t("friends.pendingRequests") ?? "Pending Requests")

                ForEach(viewModel.incomingRequests) { request in
                    FriendRequestCard(
                        request: request,
                        onAccept: { Task { await viewModel.acceptRequest(request.id) } },
                        onReject: { Task { await viewModel.rejectRequest(request.id) } }
                    )
                }
            }
        }
    }

    // MARK: - Friends List

    @ViewBuilder
    private var friendsListSection: some View {
        if !viewModel.searchResults.isEmpty {
            searchResultsList
        } else if viewModel.friends.isEmpty {
            emptyState
        } else {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                sectionHeader(
                    localization?.t("friends.myFriends") ?? "My Friends"
                )

                ForEach(viewModel.friends) { friend in
                    GlassCard {
                        UserAvatarRow(
                            name: friend.name,
                            avatarURL: friend.avatar,
                            isOnline: nil
                        )
                    }
                }
            }
        }
    }

    private var searchResultsList: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(localization?.t("friends.searchResults") ?? "Search Results")

            ForEach(viewModel.searchResults) { result in
                GlassCard {
                    HStack {
                        UserAvatarRow(name: result.name, avatarURL: result.avatar, isOnline: nil)
                        if !result.isFriend && !result.hasPendingRequest {
                            GlassButton(
                                localization?.t("friends.addFriend") ?? "Add",
                                variant: .primary,
                                size: .small,
                                action: { Task { await viewModel.sendRequest(to: result.id) } }
                            )
                            .accessibilityLabel("Send friend request to \(result.name)")
                        }
                    }
                }
            }
        }
    }

    // MARK: - Empty & Helpers

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "person.2")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization?.t("friends.emptyTitle") ?? "No friends yet")
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text(localization?.t("friends.emptySubtitle") ?? "Search for users to add friends")
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 60)
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
    }
}
