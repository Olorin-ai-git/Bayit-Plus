import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS message thread view for a conversation with a friend.
/// Reuses DirectMessagesViewModel from shared ViewModels.
struct TVConversationView: View {
    @Environment(LocalizationManager.self) private var localization
    let friendId: String

    @Environment(TVRepositoryProvider.self) private var repos
    @State private var viewModel: DirectMessagesViewModel?
    @State private var messageText = ""

    var body: some View {
        VStack(spacing: 0) {
            if let vm = viewModel {
                if vm.isLoading && vm.messages.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.messages.isEmpty {
                    tvErrorState(error) {
                        Task { await vm.loadMessages(friendId: friendId) }
                    }
                } else {
                    messageList(vm)
                    typingIndicator(vm)
                    TVMessageInputBar(
                        text: $messageText,
                        placeholder: localization.t("chat.typeMessage"),
                        onSend: { text in
                            Task {
                                await vm.sendMessage(friendId: friendId, text: text)
                                await vm.sendStopTyping(friendId: friendId)
                            }
                        }
                    )
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
            await viewModel?.loadMessages(friendId: friendId)
        }
        .onDisappear {
            Task { await viewModel?.disconnect() }
        }
        .onChange(of: messageText) { _, newValue in
            guard let vm = viewModel else { return }
            Task {
                if newValue.isEmpty {
                    await vm.sendStopTyping(friendId: friendId)
                } else {
                    await vm.sendTypingIndicator(friendId: friendId)
                }
            }
        }
    }

    // MARK: - Message List

    private func messageList(_ vm: DirectMessagesViewModel) -> some View {
        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(vm.messages) { message in
                        VStack(spacing: TVDesignTokens.Spacing.xxs) {
                            TVMessageBubble(
                                text: message.displayMessage,
                                timestamp: message.timestamp,
                                isSent: isSent(message),
                                isRead: message.read
                            )

                            if message.translationAvailable && !message.isTranslated {
                                HStack {
                                    if isSent(message) { Spacer() }
                                    GlassButton(
                                        "Translate",
                                        variant: .ghost,
                                        size: .small,
                                        icon: Image(systemName: "globe")
                                    ) {
                                        Task { await vm.translateMessage(messageId: message.id) }
                                    }
                                    if !isSent(message) { Spacer() }
                                }
                            }
                        }
                        .id(message.id)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
            }
            .onChange(of: vm.messages.count) { _, _ in
                if let lastId = vm.messages.last?.id {
                    withAnimation(.easeOut) {
                        proxy.scrollTo(lastId, anchor: .bottom)
                    }
                }
            }
        }
    }

    // MARK: - Typing Indicator

    @ViewBuilder
    private func typingIndicator(_ vm: DirectMessagesViewModel) -> some View {
        if !vm.typingUsers.isEmpty {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                ProgressView()
                    .tint(DesignTokens.Text.muted)
                    .scaleEffect(0.8)
                Text(localization.t("chat.typing"))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.xs)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Loading

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("chat.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Helpers

    private func isSent(_ message: DirectMessageModel) -> Bool {
        message.senderId != friendId
    }
}
