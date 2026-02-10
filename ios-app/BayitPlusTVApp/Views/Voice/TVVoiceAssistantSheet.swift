import BayitDesignSystem
import SwiftUI

/// tvOS voice assistant modal. Uses text input instead of microphone.
/// On Apple TV, Siri Remote does not expose direct mic access to apps.
struct TVVoiceAssistantSheet: View {

    let chatRepository: any ChatRepository
    let onDismiss: () -> Void

    @State private var inputText = ""
    @State private var aiResponse = ""
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @FocusState private var isInputFocused: Bool

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: TVDesignTokens.Spacing.xl) {
                header
                Spacer()
                queryOrb
                Spacer()
                conversationArea
                textInputBar
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Text("Voice Assistant")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            GlassButton("Close", variant: .secondary, size: .small) {
                onDismiss()
            }
            .tvFocusStyle()
        }
    }

    // MARK: - Query Orb

    private var queryOrb: some View {
        ZStack {
            Circle()
                .stroke(orbColor.opacity(0.2), lineWidth: 2)
                .frame(width: 200, height: 200)
                .scaleEffect(isProcessing ? 1.1 : 1.0)
                .animation(
                    isProcessing
                        ? .easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                        : .easeInOut(duration: 0.4),
                    value: isProcessing
                )

            Circle()
                .fill(orbColor.opacity(0.15))
                .frame(width: 150, height: 150)

            Circle()
                .fill(
                    RadialGradient(
                        colors: [orbColor.opacity(0.8), orbColor.opacity(0.3)],
                        center: .center,
                        startRadius: 0,
                        endRadius: 55
                    )
                )
                .frame(width: 110, height: 110)

            stateIcon
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.7), value: isProcessing)
    }

    @ViewBuilder
    private var stateIcon: some View {
        if isProcessing {
            ProgressView()
                .tint(DesignTokens.Text.primary)
                .scaleEffect(1.5)
        } else if !aiResponse.isEmpty {
            Image(systemName: "checkmark")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
        } else {
            Image(systemName: "text.bubble")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private var orbColor: Color {
        if isProcessing { return DesignTokens.Warning.default }
        if !aiResponse.isEmpty { return DesignTokens.Success.default }
        return DesignTokens.Primary.p400
    }

    // MARK: - Conversation Area

    private var conversationArea: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            if let error = errorMessage {
                Text(error)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                    .multilineTextAlignment(.center)
            }

            if !inputText.isEmpty || !aiResponse.isEmpty {
                if !aiResponse.isEmpty {
                    HStack {
                        Text(aiResponse)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .padding(TVDesignTokens.Spacing.md)
                            .background(DesignTokens.Glass.bgMedium)
                            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                        Spacer()
                    }
                }
            }

            if isProcessing {
                Text("Thinking...")
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .frame(minHeight: 80)
    }

    // MARK: - Text Input Bar

    private var textInputBar: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            TextField("Type your question...", text: $inputText)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .focused($isInputFocused)
                .submitLabel(.send)
                .onSubmit { processQuery() }

            GlassButton("Ask", variant: .primary, size: .medium) {
                processQuery()
            }
            .tvFocusStyle()
            .disabled(inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isProcessing)
        }
        .padding(TVDesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    // MARK: - Actions

    private func processQuery() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        errorMessage = nil
        aiResponse = ""
        isProcessing = true
        let userMessage = text
        inputText = ""

        Task {
            do {
                let request = ChatRequest(
                    message: userMessage,
                    conversationId: nil,
                    context: "voice_assistant",
                    language: nil
                )
                let response = try await chatRepository.sendMessage(request)
                aiResponse = response.response ?? ""
            } catch {
                errorMessage = "Could not get a response"
            }
            isProcessing = false
        }
    }
}
