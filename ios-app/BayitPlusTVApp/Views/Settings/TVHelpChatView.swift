#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVHelpChatView: View {
        let onDismiss: () -> Void

        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(LocalizationManager.self) private var localization
        @Environment(\.appConfiguration) private var appConfig

        @State private var viewModel: TVHelpChatViewModel?
        @State private var inputText = ""
        @FocusState private var inputFocused: Bool

        var body: some View {
            ZStack {
                LinearGradient(
                    stops: [
                        .init(color: Color(hex: 0x0D0B1A), location: 0.00),
                        .init(color: Color(hex: 0x1A1040), location: 0.35),
                        .init(color: Color(hex: 0x0A0818), location: 1.00),
                    ],
                    startPoint: UnitPoint(x: 0.33, y: 0.03),
                    endPoint: UnitPoint(x: 0.67, y: 0.97)
                )
                .ignoresSafeArea()

                VStack(spacing: 0) {
                    TVProfileSheetHeader(
                        title: localization.t("settings.help.chatWithAI"),
                        onDismiss: { viewModel?.cancel(); onDismiss() }
                    )
                    messagesList
                    inputBar
                }
            }
            .preferredColorScheme(.dark)
            .onExitCommand { viewModel?.cancel(); onDismiss() }
            .task {
                viewModel = TVHelpChatViewModel(
                    configuration: appConfig,
                    authTokenProvider: repos.authTokenProvider,
                    language: localization.currentLanguage.rawValue
                )
            }
        }

        private var messagesList: some View {
            ScrollViewReader { proxy in
                ScrollView(.vertical, showsIndicators: false) {
                    LazyVStack(alignment: .leading, spacing: 16) {
                        if viewModel?.messages.isEmpty ?? true {
                            emptyState
                        }
                        ForEach(viewModel?.messages ?? []) { msg in
                            ChatBubble(message: msg)
                                .id(msg.id)
                        }
                    }
                    .padding(.horizontal, 80)
                    .padding(.vertical, 32)
                }
                .onChange(of: viewModel?.messages.count) { _, _ in
                    if let last = viewModel?.messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }
            .frame(maxHeight: .infinity)
        }

        private var emptyState: some View {
            VStack(spacing: 20) {
                Image(systemName: "sparkles")
                    .font(.system(size: 56))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color(hex: 0x7C3AED), Color(hex: 0xA855F7)],
                            startPoint: .topLeading, endPoint: .bottomTrailing
                        )
                    )
                Text(localization.t("settings.help.askAnything"))
                    .font(.system(size: 28, weight: .medium))
                    .foregroundColor(.white.opacity(0.5))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 60)
        }

        private var inputBar: some View {
            HStack(spacing: 20) {
                TextField(
                    localization.t("settings.help.typeMessage"),
                    text: $inputText
                )
                .font(.system(size: 28))
                .foregroundColor(.white)
                .padding(.horizontal, 28)
                .padding(.vertical, 20)
                .background(Color.white.opacity(0.07))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                .focused($inputFocused)

                Button {
                    let text = inputText.trimmingCharacters(in: .whitespaces)
                    guard !text.isEmpty else { return }
                    inputText = ""
                    viewModel?.send(message: text)
                } label: {
                    Image(systemName: viewModel?.isSending == true ? "ellipsis.circle" : "arrow.up.circle.fill")
                        .font(.system(size: 52))
                        .foregroundStyle(
                            viewModel?.isSending == true
                                ? AnyShapeStyle(Color.white.opacity(0.3))
                                : AnyShapeStyle(LinearGradient(
                                    colors: [Color(hex: 0x7C3AED), Color(hex: 0xA855F7)],
                                    startPoint: .topLeading, endPoint: .bottomTrailing
                                ))
                        )
                }
                .disabled(viewModel?.isSending == true)
            }
            .padding(.horizontal, 80)
            .padding(.vertical, 28)
            .background(Color.black.opacity(0.30))
        }
    }

    // MARK: - Chat Bubble

    private struct ChatBubble: View {
        let message: TVHelpChatMessage

        var body: some View {
            HStack(alignment: .bottom, spacing: 12) {
                if message.role == .assistant { assistantAvatar }
                VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 4) {
                    Text(message.text.isEmpty ? "..." : message.text)
                        .font(.system(size: 26))
                        .foregroundColor(message.role == .user ? .white : .white.opacity(0.9))
                        .lineSpacing(6)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 16)
                        .background(
                            message.role == .user
                                ? AnyShapeStyle(LinearGradient(
                                    colors: [Color(hex: 0x7C3AED), Color(hex: 0xA855F7)],
                                    startPoint: .topLeading, endPoint: .bottomTrailing
                                ))
                                : AnyShapeStyle(Color.white.opacity(0.07))
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .frame(maxWidth: 900, alignment: message.role == .user ? .trailing : .leading)
                if message.role == .user { Spacer(minLength: 0) }
            }
            .frame(maxWidth: .infinity, alignment: message.role == .user ? .trailing : .leading)
        }

        private var assistantAvatar: some View {
            ZStack {
                LinearGradient(
                    colors: [Color(hex: 0x7C3AED), Color(hex: 0xA855F7)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
                Image(systemName: "sparkles")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)
            }
            .frame(width: 44, height: 44)
            .clipShape(Circle())
        }
    }
#endif
