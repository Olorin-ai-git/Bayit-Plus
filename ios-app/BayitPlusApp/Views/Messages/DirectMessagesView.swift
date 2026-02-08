import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Conversation list screen showing all DM conversations with search functionality.
struct DirectMessagesView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: DirectMessagesViewModel?

    var body: some View {
        Group {
            if let vm = viewModel {
                conversationListContent(vm)
            } else {
                ProgressView()
                    .tint(DesignTokens.Text.primary)
            }
        }
        .task { await setupAndLoad() }
        .onDisappear { Task { await viewModel?.disconnect() } }
    }

    // MARK: - Content

    @ViewBuilder
    private func conversationListContent(_ vm: DirectMessagesViewModel) -> some View {
        if vm.isLoading {
            ProgressView()
                .tint(DesignTokens.Text.primary)
        } else if let error = vm.error {
            ErrorStateView(message: error, onRetry: {
                Task { await vm.loadConversations() }
            })
        } else {
            VStack(spacing: 0) {
                searchBar(vm)
                conversationsList(vm)
            }
        }
    }

    private func searchBar(_ vm: DirectMessagesViewModel) -> some View {
        @Bindable var bindableVM = vm
        return GlassTextField(
            localization.t("dm.searchPlaceholder"),
            text: $bindableVM.searchQuery
        )
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .accessibilityLabel(localization.t("dm.searchConversations"))
    }

    @ViewBuilder
    private func conversationsList(_ vm: DirectMessagesViewModel) -> some View {
        if vm.filteredConversations.isEmpty {
            emptyState
        } else {
            ScrollView {
                LazyVStack(spacing: DesignTokens.Spacing.xs) {
                    ForEach(vm.filteredConversations) { conversation in
                        ConversationRowCard(conversation: conversation) {
                            coordinator.navigate(
                                to: .conversation(friendId: conversation.friendId)
                            )
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: DesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("dm.noConversations"))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .combine)
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

// MARK: - Conversation Row

private struct ConversationRowCard: View {
    let conversation: ConversationSummary
    let onTap: () -> Void

    var body: some View {
        GlassCard {
            Button(action: onTap) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    UserAvatarRow(
                        name: conversation.friendName,
                        avatarURL: conversation.friendAvatar,
                        isOnline: nil
                    )

                    Spacer()

                    VStack(alignment: .trailing, spacing: DesignTokens.Spacing.xxs) {
                        Text(formattedDate)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)

                        if conversation.unreadCount > 0 {
                            Text(String(conversation.unreadCount))
                                .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .padding(.horizontal, DesignTokens.Spacing.xs)
                                .padding(.vertical, 2)
                                .background(DesignTokens.Primary.p600)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
            .buttonStyle(.plain)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityDescription)
        .accessibilityAddTraits(.isButton)
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: conversation.lastMessageAt)
    }

    private var accessibilityDescription: String {
        var desc = conversation.friendName
        if conversation.unreadCount > 0 {
            desc += ", \(conversation.unreadCount) unread"
        }
        return desc
    }
}
