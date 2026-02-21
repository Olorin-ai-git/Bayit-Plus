import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Conversation Area and Voice Input

extension AvatarModeView {
    var conversationArea: some View {
        ScrollView {
            ScrollViewReader { proxy in
                LazyVStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(viewModel.dialogues) { dialogue in
                        dialogueBubble(dialogue)
                            .id(dialogue.id)
                    }

                    if viewModel.currentState == .thinking {
                        typingIndicator
                            .id("typing")
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.md)
                .onChange(of: viewModel.dialogues.count) { _, _ in
                    withAnimation {
                        proxy.scrollTo(viewModel.dialogues.last?.id, anchor: .bottom)
                    }
                }
            }
        }
        .frame(maxHeight: 200)
    }

    func dialogueBubble(_ dialogue: AvatarDialogue) -> some View {
        let isUser = dialogue.action == "user_input"
        return HStack {
            if isUser { Spacer() }

            Text(dialogue.text ?? "")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(isUser ? DesignTokens.Glass.purpleStrong : DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

            if !isUser { Spacer() }
        }
    }

    var typingIndicator: some View {
        HStack {
            HStack(spacing: DesignTokens.Spacing.xs) {
                ForEach(0 ..< 3, id: \.self) { index in
                    Circle()
                        .fill(DesignTokens.Text.muted)
                        .frame(width: 6, height: 6)
                        .scaleEffect(viewModel.currentState == .thinking ? 1.3 : 0.8)
                        .animation(
                            .easeInOut(duration: 0.5)
                                .repeatForever(autoreverses: true)
                                .delay(Double(index) * 0.15),
                            value: viewModel.currentState
                        )
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

            Spacer()
        }
    }

    var voiceInputBar: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            if !viewModel.currentTranscript.isEmpty && viewModel.currentState == .listening {
                Text(viewModel.currentTranscript)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(2)
                    .padding(.horizontal, DesignTokens.Spacing.base)
            }

            HStack(spacing: DesignTokens.Spacing.xl) {
                Spacer()

                Button {
                    Task {
                        if viewModel.currentState == .idle {
                            await viewModel.startVoiceInput()
                        } else if viewModel.currentState == .listening {
                            await viewModel.stopVoiceInput()
                        }
                    }
                } label: {
                    ZStack {
                        Circle()
                            .fill(voiceButtonColor)
                            .frame(width: 64, height: 64)

                        Image(systemName: voiceButtonIcon)
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }
                }
                .disabled(viewModel.currentState == .thinking || viewModel.currentState == .speaking)
                .accessibilityLabel(viewModel.currentState == .listening ? "Stop listening" : "Start voice input")

                Spacer()
            }
        }
        .padding(.bottom, DesignTokens.Spacing.xxl)
    }
}
