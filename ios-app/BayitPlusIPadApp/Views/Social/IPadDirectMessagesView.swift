import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// iPad-optimized direct messages with split conversation list + chat view
struct IPadDirectMessagesView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: DirectMessagesViewModel?
    @State private var selectedFriendId: String?

    var body: some View {
        HStack(spacing: 0) {
            conversationListPanel
                .frame(width: 320)

            Divider().background(DesignTokens.Glass.border)

            chatPanel
                .frame(maxWidth: .infinity)
        }
        .background(DesignTokens.Background.primary)
        .task { await setupAndLoad() }
        .onDisappear { Task { await viewModel?.disconnect() } }
    }

    // MARK: - Left: Conversation List

    private var conversationListPanel: some View {
        VStack(spacing: 0) {
            HStack {
                Text(localization.t("messages.title"))
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                Spacer()
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.md)

            if let vm = viewModel {
                searchBar(vm)
                conversationsList(vm)
            } else {
                Spacer()
                ProgressView().tint(DesignTokens.Text.primary)
                Spacer()
            }
        }
        .background(DesignTokens.Glass.bg)
    }

    private func searchBar(_ vm: DirectMessagesViewModel) -> some View {
        @Bindable var bindableVM = vm
        return GlassTextField(localization.t("dm.searchPlaceholder"), text: $bindableVM.searchQuery)
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.bottom, DesignTokens.Spacing.sm)
    }

    @ViewBuilder
    private func conversationsList(_ vm: DirectMessagesViewModel) -> some View {
        if vm.filteredConversations.isEmpty {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "bubble.left.and.bubble.right")
                    .font(.system(size: 32))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(localization.t("dm.noConversations"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ScrollView {
                LazyVStack(spacing: DesignTokens.Spacing.xs) {
                    ForEach(vm.filteredConversations) { conv in
                        conversationRow(conv)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.md)
            }
        }
    }

    private func conversationRow(_ conv: ConversationSummary) -> some View {
        let isSelected = selectedFriendId == conv.friendId
        return Button {
            selectedFriendId = conv.friendId
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                UserAvatarRow(
                    name: conv.friendName,
                    avatarURL: conv.friendAvatar,
                    isOnline: nil
                )
                Spacer()
                if conv.unreadCount > 0 {
                    Text(String(conv.unreadCount))
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(.horizontal, DesignTokens.Spacing.xs)
                        .padding(.vertical, 2)
                        .background(DesignTokens.Primary.p600)
                        .clipShape(Capsule())
                }
            }
            .padding(DesignTokens.Spacing.md)
            .background(isSelected ? DesignTokens.Glass.bgMedium : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Right: Chat

    @ViewBuilder
    private var chatPanel: some View {
        if let friendId = selectedFriendId {
            ConversationView(friendId: friendId)
        } else {
            VStack(spacing: DesignTokens.Spacing.lg) {
                Image(systemName: "bubble.left.and.bubble.right")
                    .font(.system(size: 48))
                    .foregroundColor(DesignTokens.Text.muted)
                Text(localization.t("dm.selectConversation"))
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.secondary)
            }
        }
    }

    // MARK: - Setup

    private func setupAndLoad() async {
        guard viewModel == nil else { return }
        let vm = DirectMessagesViewModel(
            repository: repos.directMessages,
            authTokenProvider: repos.authTokenProvider
        )
        viewModel = vm
        await vm.loadConversations()
    }
}
