import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Full-screen AI chatbot conversation view.
///
/// Displays message history with auto-scrolling, a glass-styled input bar
/// with send and voice input buttons, and contextual suggestion chips.
struct ChatbotView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) var localization
    @State var viewModel: ChatbotViewModel

    init(repository: any ChatRepository) {
        _viewModel = State(initialValue: ChatbotViewModel(repository: repository))
    }

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: 0) {
                messageList
                suggestionChips
                inputBar
            }
        }
        .navigationTitle("AI Assistant")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        viewModel.startNewConversation()
                    } label: {
                        Label("New Chat", systemImage: "plus.message")
                    }

                    Button(role: .destructive) {
                        Task { await viewModel.deleteConversation() }
                    } label: {
                        Label("Delete Chat", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
        }
    }

    // MARK: - Message List

    private var messageList: some View {
        ScrollView {
            ScrollViewReader { proxy in
                LazyVStack(spacing: DesignTokens.Spacing.md) {
                    if viewModel.messages.isEmpty {
                        emptyState
                    }

                    ForEach(viewModel.messages, id: \.stableId) { message in
                        ChatMessageBubble(message: message)
                            .id(message.stableId)
                    }

                    if viewModel.isLoading {
                        ChatTypingIndicator()
                            .id("typing")
                    }

                    if let error = viewModel.error {
                        errorBanner(error)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.md)
                .onChange(of: viewModel.messages.count) { _, _ in
                    scrollToBottom(proxy: proxy)
                }
                .onChange(of: viewModel.isLoading) { _, _ in
                    scrollToBottom(proxy: proxy)
                }
            }
        }
    }

    private func scrollToBottom(proxy: ScrollViewProxy) {
        withAnimation(.easeOut(duration: 0.2)) {
            if viewModel.isLoading {
                proxy.scrollTo("typing", anchor: .bottom)
            } else if let lastId = viewModel.messages.last?.stableId {
                proxy.scrollTo(lastId, anchor: .bottom)
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Spacer()
                .frame(height: 80)

            ZStack {
                Circle()
                    .fill(DesignTokens.Glass.purpleLight)
                    .frame(width: 80, height: 80)

                Image(systemName: "bubble.left.and.bubble.right")
                    .font(.system(size: 32))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }

            Text(localization.t("chatbot.welcome"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("chatbot.greeting"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.xxl)
        }
    }

    // MARK: - Error Banner

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "exclamationmark.triangle")
                .foregroundStyle(DesignTokens.ErrorColor.default)

            Text(message)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.ErrorColor.default)
                .lineLimit(2)
        }
        .glassCard(radius: DesignTokens.Radius.md, padding: DesignTokens.Spacing.sm)
    }
}
