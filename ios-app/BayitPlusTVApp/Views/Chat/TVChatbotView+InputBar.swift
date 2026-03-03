#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Input Bar & Microphone

    extension TVChatbotView {
        func inputBar(_ vm: TVChatbotViewModel) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                microphoneButton(vm)

                TextField(localization.t("chatbot.placeholder"), text: Bindable(vm).inputText)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .submitLabel(.send)
                    .onSubmit { Task { await vm.sendMessage() } }

                GlassButton("Send", variant: .primary, size: .medium) {
                    Task { await vm.sendMessage() }
                }
                .tvFocusStyle()
                .disabled(vm.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                GlassButton("New Chat", variant: .secondary, size: .medium) {
                    vm.startNewConversation()
                }
                .tvFocusStyle()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }

        func microphoneButton(_ vm: TVChatbotViewModel) -> some View {
            Button {
                Task { await vm.toggleVoiceInput() }
            } label: {
                ZStack {
                    Circle()
                        .fill(vm.isRecording ? Color.red.opacity(0.2) : DesignTokens.Glass.bgLight)
                        .frame(width: 60, height: 60)

                    if vm.isRecording {
                        Circle()
                            .stroke(Color.red, lineWidth: 3)
                            .frame(width: 60, height: 60)
                            .scaleEffect(vm.isRecording ? 1.15 : 1.0)
                            .opacity(vm.isRecording ? 0.6 : 1.0)
                            .animation(
                                .easeInOut(duration: 0.8).repeatForever(autoreverses: true),
                                value: vm.isRecording
                            )
                    }

                    Image(systemName: vm.isRecording ? "mic.fill" : "mic")
                        .font(.system(size: 24))
                        .foregroundStyle(
                            vm.isRecording ? Color.red : DesignTokens.Text.primary
                        )
                }
            }
            .tvCardStyle()
            .disabled(vm.isTranscribing)
            .accessibilityLabel(vm.isRecording ? "Stop recording" : "Start voice input")
            .accessibilityHint("Press to use Siri Remote microphone")
        }
    }
#endif
