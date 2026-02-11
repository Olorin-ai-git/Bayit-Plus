#if os(tvOS)
import BayitDesignSystem
import BayitNetworking
import SwiftUI

/// tvOS live channel chat panel with text input via Siri Remote.
/// Reuses ChannelChatViewModel from shared ViewModels.
struct TVChannelChatView: View {

    @State private var viewModel: ChannelChatViewModel
    let channelId: String
    let authToken: String
    let onDismiss: () -> Void

    init(repository: any LiveTVRepository, webSocketManager: WebSocketManager,
         channelId: String, authToken: String,
         onDismiss: @escaping () -> Void) {
        _viewModel = State(initialValue: ChannelChatViewModel(
            repository: repository, webSocketManager: webSocketManager
        ))
        self.channelId = channelId
        self.authToken = authToken
        self.onDismiss = onDismiss
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            messageList
            inputBar
        }
        .background(DesignTokens.Background.primary)
        .task { await viewModel.connect(channelId: channelId, authToken: authToken) }
        .onDisappear { viewModel.disconnect() }
    }

    private var header: some View {
        HStack {
            Circle()
                .fill(viewModel.isConnected ? DesignTokens.Success.default : DesignTokens.Text.muted)
                .frame(width: 12, height: 12)

            Text("Live Chat")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            if viewModel.isLoading {
                ProgressView().tint(DesignTokens.Primary.default)
            }

            Spacer()

            GlassButton("Close", variant: .secondary, size: .medium) { onDismiss() }
                .tvFocusStyle()
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(viewModel.messages) { message in
                        chatMessageRow(message).id(message.id)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .onChange(of: viewModel.messages.count) { _, _ in
                if let lastId = viewModel.messages.last?.id {
                    withAnimation { proxy.scrollTo(lastId, anchor: .bottom) }
                }
            }
        }
    }

    private func chatMessageRow(_ message: ChannelChatMessage) -> some View {
        HStack(alignment: .top, spacing: TVDesignTokens.Spacing.md) {
            Circle()
                .fill(DesignTokens.Glass.purpleLight)
                .frame(width: 40, height: 40)
                .overlay(
                    Text(String((message.username ?? "?").prefix(1)).uppercased())
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.p300)
                )

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(message.username ?? "Anonymous")
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p300)

                Text(message.content)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            Spacer()
        }
    }

    private var inputBar: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            TextField("Say something...", text: Bindable(viewModel).inputText)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .submitLabel(.send)
                .onSubmit { viewModel.sendMessage() }

            GlassButton("Send", variant: .primary, size: .medium) {
                viewModel.sendMessage()
            }
            .tvFocusStyle()
            .disabled(viewModel.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.bottom, TVDesignTokens.Spacing.lg)
    }
}
#endif
