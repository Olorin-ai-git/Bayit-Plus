import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS conversation list screen for Direct Messages.
/// Reuses DirectMessagesViewModel from shared ViewModels.
struct TVDirectMessagesView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: DirectMessagesViewModel?
    @State private var selectedFriendId: String?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.conversations.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.conversations.isEmpty {
                    if error.lowercased().contains("forbidden") || error.lowercased().contains("friends") {
                        emptyState
                    } else {
                        tvErrorState(error) {
                            Task { await vm.loadConversations() }
                        }
                    }
                } else if vm.filteredConversations.isEmpty && vm.searchQuery.isEmpty {
                    emptyState
                } else {
                    conversationList(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = DirectMessagesViewModel(
                    repository: repos.directMessages,
                    authTokenProvider: repos.authTokenProvider
                )
            }
            await viewModel?.loadConversations()
        }
        .onDisappear {
            Task { await viewModel?.disconnect() }
        }
    }

    private func conversationList(_ vm: DirectMessagesViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.md) {
            @Bindable var bindableVM = vm
            GlassTextField(
                localization.t("messages.searchConversations"),
                text: $bindableVM.searchQuery,
                icon: Image(systemName: "magnifyingglass")
            )
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.top, TVDesignTokens.Spacing.lg)

            ForEach(vm.filteredConversations) { conversation in
                Button {
                    selectedFriendId = conversation.friendId
                } label: {
                    TVConversationRowCard(conversation: conversation)
                }
                .tvCardStyle()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
        .padding(.bottom, TVDesignTokens.Spacing.xl)
        .fullScreenCover(isPresented: Binding(
            get: { selectedFriendId != nil },
            set: { if !$0 { selectedFriendId = nil } }
        )) {
            if let friendId = selectedFriendId {
                TVConversationView(friendId: friendId)
                    .tvBreadcrumb(
                        localization.t("profile.messages"),
                        icon: "bubble.left.and.bubble.right"
                    )
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            VStack(spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("messages.noConversations"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("messages.startChatHint"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 600)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("messages.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}

// MARK: - Conversation Row Card

private struct TVConversationRowCard: View {
    let conversation: ConversationSummary

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            TVUserAvatarRow(
                name: conversation.friendName,
                avatarURL: conversation.friendAvatar,
                isOnline: nil
            )

            Spacer()

            VStack(alignment: .trailing, spacing: TVDesignTokens.Spacing.xs) {
                Text(formattedTime)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)

                if conversation.unreadCount > 0 {
                    Text("\(conversation.unreadCount)")
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, TVDesignTokens.Spacing.sm)
                        .padding(.vertical, TVDesignTokens.Spacing.xxs)
                        .background(DesignTokens.Primary.p600)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
    }

    private var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: conversation.lastMessageAt)
    }
}
