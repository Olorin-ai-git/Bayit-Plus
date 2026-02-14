#if os(iOS)
import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitNetworking
import SwiftUI

/// Live channel chat panel for viewing and sending messages.
struct ChannelChatView: View {

    @Environment(\.localizationManager) private var localization
    @State private var viewModel: ChannelChatViewModel
    let channelId: String
    let authToken: String
    let onDismiss: () -> Void

    init(
        repository: any LiveTVRepository,
        webSocketManager: WebSocketManager,
        channelId: String,
        authToken: String,
        onDismiss: @escaping () -> Void
    ) {
        _viewModel = State(initialValue: ChannelChatViewModel(
            repository: repository,
            webSocketManager: webSocketManager
        ))
        self.channelId = channelId
        self.authToken = authToken
        self.onDismiss = onDismiss
    }

    var body: some View {
        VStack(spacing: 0) {
            header

            if viewModel.isLoading {
                Spacer()
                ProgressView().tint(DesignTokens.Primary.default)
                Spacer()
            } else if let error = viewModel.error {
                errorView(error)
            } else {
                messageList
                inputBar
            }
        }
        .background(DesignTokens.Background.primary)
        .task { await viewModel.connect(channelId: channelId, authToken: authToken) }
        .onDisappear { viewModel.disconnect() }
    }

    private var header: some View {
        HStack {
            Circle()
                .fill(viewModel.isConnected ? DesignTokens.Success.default : DesignTokens.Text.muted)
                .frame(width: 8, height: 8)
            Text(localization?.t("channelChat.title") ?? "Live Chat")
                .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
            Button { onDismiss() } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .accessibilityLabel("Close chat")
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: true) {
                LazyVStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(viewModel.messages) { message in
                        chatMessageRow(message)
                            .id(message.id)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.sm)
            }
            .onChange(of: viewModel.messages.count) { _, _ in
                if let lastId = viewModel.messages.last?.id {
                    withAnimation { proxy.scrollTo(lastId, anchor: .bottom) }
                }
            }
        }
    }

    private func chatMessageRow(_ message: ChannelChatMessage) -> some View {
        HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
            Circle()
                .fill(DesignTokens.Glass.purpleLight)
                .frame(width: 28, height: 28)
                .overlay(
                    Text(String((message.username ?? "?").prefix(1)).uppercased())
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.p300)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(message.username ?? "Anonymous")
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p300)
                Text(message.content)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            Spacer()
        }
    }

    private var inputBar: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            TextField(localization?.t("channelChat.inputPlaceholder") ?? "Say something...", text: Bindable(viewModel).inputText)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.primary)
                .submitLabel(.send)
                .onSubmit { viewModel.sendMessage() }

            GlassButton("Send", variant: .primary, size: .small) {
                viewModel.sendMessage()
            }
            .disabled(viewModel.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bgMedium)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Spacer()
            Text(message)
                .foregroundStyle(DesignTokens.Text.secondary)
            GlassButton("Retry", variant: .secondary) {
                Task { await viewModel.connect(channelId: channelId, authToken: authToken) }
            }
            Spacer()
        }
    }
}
#endif
