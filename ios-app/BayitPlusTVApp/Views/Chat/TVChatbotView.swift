#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS AI chatbot conversation view with text and voice input.
    struct TVChatbotView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(LocalizationManager.self) var localization
        @State private var viewModel: TVChatbotViewModel?

        var body: some View {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    VStack(spacing: 0) {
                        if vm.messages.isEmpty {
                            emptyState
                        } else {
                            messageList(vm)
                        }

                        suggestionChips(vm)
                        inputBar(vm)
                    }
                }
            }
            .background(DesignTokens.Background.primary)
            .task {
                if viewModel == nil {
                    viewModel = TVChatbotViewModel(repository: repos.chat)
                }
            }
        }

        // MARK: - Empty State

        private var emptyState: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Spacer()
                    .frame(height: TVDesignTokens.Spacing.xxxxl)

                ZStack {
                    Circle()
                        .fill(DesignTokens.Glass.purpleLight)
                        .frame(width: 120, height: 120)

                    Image(systemName: "bubble.left.and.bubble.right")
                        .font(.system(size: TVDesignTokens.FontSize.xxxl))
                        .foregroundStyle(DesignTokens.Primary.p300)
                }

                Text(localization.t("chatbot.welcome"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("chatbot.greeting"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
            }
        }

        // MARK: - Message List

        private func messageList(_ vm: TVChatbotViewModel) -> some View {
            LazyVStack(spacing: TVDesignTokens.Spacing.lg) {
                ForEach(vm.messages, id: \.stableId) { message in
                    TVChatMessageBubble(message: message)
                }

                if vm.isLoading {
                    TVChatTypingIndicator()
                }

                if vm.isTranscribing {
                    transcribingIndicator
                }

                if let error = vm.error {
                    errorBanner(error)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
        }

        private var transcribingIndicator: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                ProgressView()
                    .tint(DesignTokens.Primary.p300)
                Text(localization.t("voice.processing"))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(TVDesignTokens.Spacing.md)
            .accessibilityLabel("Transcribing audio")
        }

        private func errorBanner(_ message: String) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "exclamationmark.triangle")
                    .foregroundStyle(DesignTokens.ErrorColor.default)

                Text(message)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                    .lineLimit(2)
            }
            .padding(TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }

        // MARK: - Suggestion Chips

        @ViewBuilder
        private func suggestionChips(_ vm: TVChatbotViewModel) -> some View {
            if !vm.suggestions.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        ForEach(vm.suggestions, id: \.self) { suggestion in
                            Button {
                                Task { await vm.sendSuggestion(suggestion) }
                            } label: {
                                Text(suggestion)
                                    .font(.system(size: TVDesignTokens.FontSize.sm))
                                    .foregroundStyle(DesignTokens.Text.primary)
                                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                                    .padding(.vertical, TVDesignTokens.Spacing.md)
                                    .background(DesignTokens.Glass.bgLight)
                                    .clipShape(Capsule())
                                    .overlay(
                                        Capsule()
                                            .stroke(DesignTokens.Glass.border, lineWidth: 1)
                                    )
                            }
                            .tvCardStyle()
                            .accessibilityLabel("Suggestion: \(suggestion)")
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                }
            }
        }
    }
#endif
