import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Message thread view for a specific DM conversation.
/// Shows messages as bubbles, typing indicator, and input bar at bottom.
struct ConversationView: View {
    let friendId: String

    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: DirectMessagesViewModel?
    @State private var messageText = ""

    var body: some View {
        Group {
            if let vm = viewModel {
                conversationContent(vm)
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
    private func conversationContent(_ vm: DirectMessagesViewModel) -> some View {
        if vm.isLoading && vm.messages.isEmpty {
            ProgressView()
                .tint(DesignTokens.Text.primary)
        } else if let error = vm.error, vm.messages.isEmpty {
            ErrorStateView(message: error, onRetry: {
                Task { await vm.loadMessages(friendId: friendId) }
            })
        } else {
            VStack(spacing: 0) {
                messagesList(vm)
                typingIndicator(vm)
                messageInputBar(vm)
            }
        }
    }

    // MARK: - Messages List

    private func messagesList(_ vm: DirectMessagesViewModel) -> some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(vm.messages) { message in
                        messageBubbleRow(message, vm: vm)
                            .id(message.id)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.sm)
            }
            .onChange(of: vm.messages.count) {
                if let lastId = vm.messages.last?.id {
                    withAnimation { proxy.scrollTo(lastId, anchor: .bottom) }
                }
            }
        }
    }

    private func messageBubbleRow(_ message: DirectMessageModel, vm: DirectMessagesViewModel) -> some View {
        VStack(alignment: isSent(message) ? .trailing : .leading, spacing: DesignTokens.Spacing.xxs) {
            MessageBubble(
                text: message.displayMessage,
                timestamp: message.timestamp,
                isSent: isSent(message),
                isRead: message.read
            )

            if message.translationAvailable && !message.isTranslated {
                translateButton(message, vm: vm)
            }
        }
    }

    private func translateButton(_ message: DirectMessageModel, vm: DirectMessagesViewModel) -> some View {
        GlassButton(
            localization.t("dm.translate"),
            variant: .ghost,
            size: .small,
            icon: Image(systemName: "globe"),
            action: { Task { await vm.translateMessage(messageId: message.id) } }
        )
        .accessibilityLabel(localization.t("dm.translateMessage"))
    }

    // MARK: - Typing Indicator

    @ViewBuilder
    private func typingIndicator(_ vm: DirectMessagesViewModel) -> some View {
        if !vm.typingUsers.isEmpty {
            HStack(spacing: DesignTokens.Spacing.xs) {
                ProgressView()
                    .scaleEffect(0.7)
                    .tint(DesignTokens.Text.muted)

                Text(localization.t("dm.typing"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
            .padding(.vertical, DesignTokens.Spacing.xxs)
            .accessibilityLabel(localization.t("dm.typing"))
        }
    }

    // MARK: - Input

    private func messageInputBar(_ vm: DirectMessagesViewModel) -> some View {
        MessageInputBar(
            text: $messageText,
            placeholder: localization.t("dm.messagePlaceholder"),
            onSend: { text in
                Task {
                    await vm.sendMessage(friendId: friendId, text: text)
                    await vm.sendStopTyping(friendId: friendId)
                }
            }
        )
        .onChange(of: messageText) {
            Task {
                if messageText.isEmpty {
                    await vm.sendStopTyping(friendId: friendId)
                } else {
                    await vm.sendTypingIndicator(friendId: friendId)
                }
            }
        }
    }

    // MARK: - Helpers

    private func setupAndLoad() async {
        guard viewModel == nil else { return }
        let vm = DirectMessagesViewModel(
            repository: repos.directMessages,
            authTokenProvider: repos.authTokenProvider
        )
        viewModel = vm
        await vm.loadMessages(friendId: friendId)
    }

    private func isSent(_ message: DirectMessageModel) -> Bool {
        message.senderId != friendId
    }
}
