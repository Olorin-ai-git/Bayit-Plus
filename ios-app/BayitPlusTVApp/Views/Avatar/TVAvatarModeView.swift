import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS AI avatar interaction view. Text-input only.
struct TVAvatarModeView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: TVAvatarViewModel?
    @State private var showPreferences = false

    var body: some View {
        ZStack {
            backgroundGradient

            if let vm = viewModel {
                VStack(spacing: 0) {
                    topBar(vm)
                    avatarVisualization(vm)
                        .frame(maxHeight: .infinity, alignment: .center)
                    conversationArea(vm)
                    textInputBar(vm)
                }
            }
        }
        .task {
            if viewModel == nil {
                viewModel = TVAvatarViewModel(
                    stateMachine: AvatarStateMachine(),
                    repository: repos.chat
                )
            }
        }
        .sheet(isPresented: $showPreferences) {
            if let vm = viewModel {
                TVAvatarPreferencesView(viewModel: vm)
            }
        }
    }

    // MARK: - Background

    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                DesignTokens.Background.primary,
                DesignTokens.Glass.purpleStrong.opacity(0.3),
                DesignTokens.Background.primary,
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }

    // MARK: - Top Bar

    private func topBar(_: TVAvatarViewModel) -> some View {
        HStack {
            Text(localization.t("avatar.mode"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            GlassButton("Preferences", variant: .secondary, size: .small) {
                showPreferences = true
            }
            .tvFocusStyle()
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    // MARK: - Conversation Area

    private func conversationArea(_ vm: TVAvatarViewModel) -> some View {
        ScrollView {
            LazyVStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(vm.dialogues) { dialogue in
                    dialogueBubble(dialogue)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
        }
        .frame(maxHeight: 250)
    }

    private func dialogueBubble(_ dialogue: AvatarDialogue) -> some View {
        let isUser = dialogue.action == "user_input"
        return HStack {
            if isUser { Spacer() }

            Text(dialogue.text ?? "")
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(isUser ? DesignTokens.Glass.purpleStrong : DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))

            if !isUser { Spacer() }
        }
    }

    // MARK: - Text Input Bar

    private func textInputBar(_ vm: TVAvatarViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            TextField(localization.t("avatar.askPlaceholder"), text: Bindable(vm).inputText)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)
                .submitLabel(.send)
                .onSubmit { Task { await vm.sendTextInput() } }

            GlassButton("Send", variant: .primary, size: .medium) {
                Task { await vm.sendTextInput() }
            }
            .tvFocusStyle()
            .disabled(
                vm.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    || vm.currentState == .thinking || vm.currentState == .speaking
            )
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.bottom, TVDesignTokens.Spacing.xxl)
    }
}
