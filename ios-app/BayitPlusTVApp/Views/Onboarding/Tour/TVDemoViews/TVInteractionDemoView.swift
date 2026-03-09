import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS interaction demo: click-activated character conversation exchange.
/// Uses Siri Remote click instead of touch to start the conversation.
struct TVInteractionDemoView: View {
    @Environment(LocalizationManager.self) var localization
    @State private var showConversation = false
    @State private var messageIndex = 0

    private var messages: [(role: String, key: String)] {
        [
            ("user", "onboarding.tour.interaction.msg1"),
            ("character", "onboarding.tour.interaction.msg2"),
            ("user", "onboarding.tour.interaction.msg3"),
            ("character", "onboarding.tour.interaction.msg4"),
        ]
    }

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.xxl) {
            videoFrame
            conversationPanel
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Video Frame

    private var videoFrame: some View {
        ZStack {
            InlineVideoPlayer(assetName: "demo_movie_interaction")
                .clipShape(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                )

            characterHighlight
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var characterHighlight: some View {
        GeometryReader { geo in
            Circle()
                .stroke(
                    DesignTokens.Colors.Primary.base,
                    lineWidth: TVDesignTokens.Focus.ringWidth
                )
                .frame(
                    width: geo.size.width * 0.18,
                    height: geo.size.width * 0.18
                )
                .position(
                    x: geo.size.width * 0.5,
                    y: geo.size.height * 0.4
                )
                .opacity(showConversation ? 0 : 1)
                .animation(.easeOut, value: showConversation)
        }
    }

    // MARK: - Conversation Panel

    private var conversationPanel: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("onboarding.tour.interaction.title"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            if !showConversation {
                startButton
            } else {
                chatMessages
            }

            Spacer()
        }
        .frame(maxWidth: 500)
        .padding(.top, TVDesignTokens.Spacing.xl)
    }

    private var startButton: some View {
        Button {
            withAnimation(.spring(response: 0.4)) {
                showConversation = true
            }
            advanceMessages()
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                Text(localization.t("onboarding.tour.interaction.clickCharacter"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
            }
            .foregroundStyle(DesignTokens.Text.primary)
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Colors.Primary.base)
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
            )
        }
        .buttonStyle(.card)
    }

    private var chatMessages: some View {
        ScrollView {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(0 ..< min(messageIndex, messages.count), id: \.self) { idx in
                    chatBubble(for: messages[idx])
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
        }
        .frame(maxHeight: 400)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    private func chatBubble(
        for msg: (role: String, key: String)
    ) -> some View {
        HStack {
            if msg.role == "user" { Spacer() }
            Text(localization.t(msg.key))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(TVDesignTokens.Spacing.lg)
                .background(
                    msg.role == "user"
                        ? AnyShapeStyle(
                            DesignTokens.Colors.Primary.base.opacity(0.3)
                        )
                        : AnyShapeStyle(DesignTokens.Glass.bg)
                )
                .clipShape(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                )
            if msg.role == "character" { Spacer() }
        }
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    private func advanceMessages() {
        for i in 1 ... messages.count {
            let delay = Double(i) * 1.2
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                withAnimation(.spring(response: 0.3)) {
                    messageIndex = i
                }
            }
        }
    }
}
