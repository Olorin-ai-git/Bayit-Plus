import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension on ChatbotView providing suggestion chips and input bar subviews.
extension ChatbotView {
    // MARK: - Suggestion Chips

    @ViewBuilder
    var suggestionChips: some View {
        if !viewModel.suggestions.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(viewModel.suggestions, id: \.self) { suggestion in
                        Button {
                            Task { await viewModel.sendSuggestion(suggestion) }
                        } label: {
                            Text(suggestion)
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .padding(.horizontal, DesignTokens.Spacing.md)
                                .padding(.vertical, DesignTokens.Spacing.sm)
                                .background(DesignTokens.Glass.bgLight)
                                .clipShape(Capsule())
                                .overlay(
                                    Capsule()
                                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                                )
                        }
                        .accessibilityLabel("Suggestion: \(suggestion)")
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.sm)
            }
        }
    }

    // MARK: - Input Bar

    var inputBar: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            voiceButton

            TextField(localization.t("chatbot.placeholder"), text: Bindable(viewModel).inputText)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
                .submitLabel(.send)
                .onSubmit {
                    Task { await viewModel.sendMessage() }
                }

            sendButton
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.vertical, DesignTokens.Spacing.md)
        .background(
            DesignTokens.Glass.bgMedium
                .ignoresSafeArea(edges: .bottom)
        )
    }

    var voiceButton: some View {
        Button {
            Task { await viewModel.toggleVoiceInput() }
        } label: {
            Image(systemName: viewModel.isRecording ? "mic.fill" : "mic")
                .font(.system(size: 20))
                .foregroundStyle(viewModel.isRecording ? DesignTokens.ErrorColor.default : DesignTokens.Text.secondary)
                .frame(width: 44, height: 44)
                .background(viewModel.isRecording ? DesignTokens.ErrorColor.default.opacity(0.15) : Color.clear)
                .clipShape(Circle())
        }
        .accessibilityLabel(viewModel.isRecording ? "Stop recording" : "Voice input")
    }

    var sendButton: some View {
        Button {
            Task { await viewModel.sendMessage() }
        } label: {
            Image(systemName: "arrow.up.circle.fill")
                .font(.system(size: 32))
                .foregroundStyle(
                    viewModel.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        ? DesignTokens.Text.disabled
                        : DesignTokens.Primary.default
                )
        }
        .disabled(viewModel.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        .accessibilityLabel("Send message")
    }
}
