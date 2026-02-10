import BayitDesignSystem
import SwiftUI

/// tvOS Friends screen with search, friend requests, and friends grid.
/// Reuses FriendsViewModel from shared ViewModels.
struct TVFriendsView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: FriendsViewModel?

    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.friends.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.friends.isEmpty {
                    tvErrorState(error) { Task { await vm.loadAll() } }
                } else {
                    contentSections(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = FriendsViewModel(repository: repos.friends)
            }
            await viewModel?.loadAll()
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: FriendsViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            searchSection(vm)

            if !vm.searchResults.isEmpty {
                TVFriendSearchResultsSection(results: vm.searchResults) { userId in
                    await vm.sendRequest(to: userId)
                }
            }

            if !vm.incomingRequests.isEmpty {
                requestsSection(vm.incomingRequests)
            }

            if !vm.friends.isEmpty {
                friendsGrid(vm.friends)
            } else if vm.incomingRequests.isEmpty && vm.searchResults.isEmpty {
                emptyState
            }
        }
    }

    // MARK: - Search

    private func searchSection(_ vm: FriendsViewModel) -> some View {
        @Bindable var bindableVM = vm
        return HStack(spacing: TVDesignTokens.Spacing.md) {
            GlassTextField("Search users...", text: $bindableVM.searchQuery)
                .accessibilityLabel("Search for users")

            if !vm.searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                GlassButton("Search", variant: .primary, size: .medium) {
                    Task { await vm.searchUsers() }
                }
                .tvFocusStyle()
                .accessibilityLabel("Search users")
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }

    // MARK: - Friend Requests

    private func requestsSection(_ requests: [FriendRequest]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("Friend Requests (\(requests.count))")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(requests) { request in requestCard(request) }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
        }
    }

    private func requestCard(_ request: FriendRequest) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "person.crop.circle")
                .font(.system(size: TVDesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(request.senderName)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)
            HStack(spacing: TVDesignTokens.Spacing.md) {
                GlassButton("Accept", variant: .primary, size: .medium) {
                    Task { await viewModel?.acceptRequest(request.id) }
                }
                GlassButton("Decline", variant: .secondary, size: .medium) {
                    Task { await viewModel?.rejectRequest(request.id) }
                }
            }
        }
        .frame(width: 220)
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
    }

    // MARK: - Friends Grid

    private func friendsGrid(_ friends: [Friend]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("Friends (\(friends.count))")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(friends) { friend in friendCard(friend) }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    private func friendCard(_ friend: Friend) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            TVUserAvatarRow(name: friend.name, avatarURL: friend.avatar, isOnline: nil)
        }
        .frame(maxWidth: .infinity)
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
    }

    // MARK: - States

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "person.2").font(.system(size: TVDesignTokens.FontSize.hero)).foregroundStyle(DesignTokens.Text.muted)
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Text("No friends yet").font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold)).foregroundStyle(DesignTokens.Text.primary)
                Text("Search for users to add friends").font(.system(size: TVDesignTokens.FontSize.lg)).foregroundStyle(DesignTokens.Text.secondary).multilineTextAlignment(.center).frame(maxWidth: 600)
            }
        }.frame(maxWidth: .infinity).padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
            Text("Loading Friends...").font(.system(size: TVDesignTokens.FontSize.lg)).foregroundStyle(DesignTokens.Text.muted)
        }.frame(maxWidth: .infinity, minHeight: 400)
    }
}
