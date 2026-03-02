import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Collapsible in-game chat panel for chess. Reuses MessageBubble and MessageInputBar.
struct ChessChatPanel: View {
    let messages: [ChessChatMessage]
    let currentUserId: String
    let isBotGame: Bool
    let botChatLimitReached: Bool
    @Binding var isExpanded: Bool
    let onSend: (String) -> Void

    @Environment(LocalizationManager.self) private var localization
    @State private var inputText = ""

    var body: some View {
        VStack(spacing: 0) {
            headerBar
            if isExpanded {
                chatContent
            }
        }
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.borderLight, lineWidth: 1)
        )
    }

    // MARK: - Header

    private var headerBar: some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() }
        } label: {
            HStack {
                Image(systemName: "bubble.left.and.bubble.right")
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Gradient.ctaStart)
                Text(localization.t("chess.chat.title"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                if !messages.isEmpty {
                    Text("\(messages.count)")
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                        .foregroundStyle(DesignTokens.Background.primary)
                        .padding(.horizontal, DesignTokens.Spacing.sm)
                        .padding(.vertical, DesignTokens.Spacing.xxs)
                        .background(DesignTokens.Gradient.ctaStart)
                        .clipShape(Capsule())
                }
                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Chat Content

    private var chatContent: some View {
        VStack(spacing: 0) {
            Divider().background(DesignTokens.Glass.border)
            ScrollViewReader { proxy in
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: DesignTokens.Spacing.sm) {
                        ForEach(messages) { msg in
                            chatBubble(for: msg).id(msg.id)
                        }
                    }
                    .padding(.horizontal, DesignTokens.Spacing.sm)
                    .padding(.vertical, DesignTokens.Spacing.sm)
                }
                .frame(maxHeight: 200)
                .onChange(of: messages.count) { _, _ in
                    if let last = messages.last {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
            if isBotGame && botChatLimitReached {
                Text(localization.t("chess.chat.botLimitReached"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .padding(.vertical, DesignTokens.Spacing.sm)
            } else {
                MessageInputBar(
                    text: $inputText,
                    placeholder: localization.t("chess.chat.inputPlaceholder"),
                    onSend: onSend
                )
            }
        }
    }

    // MARK: - Message Rendering

    @ViewBuilder
    private func chatBubble(for msg: ChessChatMessage) -> some View {
        if msg.isSystem {
            Text(msg.displayMessage)
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
                .frame(maxWidth: .infinity)
                .padding(.vertical, DesignTokens.Spacing.xs)
        } else if msg.isBot {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                HStack(spacing: DesignTokens.Spacing.xxs) {
                    Image(systemName: "cpu")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Gradient.ctaStart)
                    Text(msg.userName)
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                MessageBubble(
                    text: msg.displayMessage,
                    timestamp: msg.timestamp,
                    isSent: false,
                    isRead: true
                )
            }
        } else {
            MessageBubble(
                text: msg.displayMessage,
                timestamp: msg.timestamp,
                isSent: msg.userId == currentUserId,
                isRead: true
            )
        }
    }
}
