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
                DesignTokens.Background.primary
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }

    // MARK: - Top Bar

    private func topBar(_ vm: TVAvatarViewModel) -> some View {
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

    // MARK: - Avatar Visualization

    private func avatarVisualization(_ vm: TVAvatarViewModel) -> some View {
        ZStack {
            Circle()
                .stroke(outerRingColor(vm).opacity(0.2), lineWidth: 3)
                .frame(width: outerRingSize(vm), height: outerRingSize(vm))
                .scaleEffect(vm.currentState == .listening ? 1.15 : 1.0)
                .animation(
                    vm.currentState == .listening
                        ? .easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                        : .easeInOut(duration: 0.4),
                    value: vm.currentState
                )

            Circle()
                .fill(outerRingColor(vm).opacity(0.15))
                .frame(width: 180, height: 180)
                .scaleEffect(vm.currentState == .speaking ? 1.1 : 1.0)
                .animation(
                    vm.currentState == .speaking
                        ? .easeInOut(duration: 0.8).repeatForever(autoreverses: true)
                        : .easeInOut(duration: 0.3),
                    value: vm.currentState
                )

            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [orbCenterColor(vm), orbEdgeColor(vm)],
                            center: .center,
                            startRadius: 0,
                            endRadius: 65
                        )
                    )
                    .frame(width: 130, height: 130)

                stateIcon(vm)
            }
            .scaleEffect(vm.currentState == .celebrating ? 1.2 : 1.0)
        }
        .animation(
            .spring(response: vm.springResponse, dampingFraction: 1.0 - vm.springBounce),
            value: vm.currentState
        )
    }

    @ViewBuilder
    private func stateIcon(_ vm: TVAvatarViewModel) -> some View {
        switch vm.currentState {
        case .idle:
            Image(systemName: "waveform")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
        case .listening:
            Image(systemName: "text.cursor")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .medium))
                .foregroundStyle(DesignTokens.Primary.p300)
        case .thinking:
            ProgressView()
                .tint(DesignTokens.Text.primary)
                .scaleEffect(1.5)
        case .speaking:
            Image(systemName: "speaker.wave.3.fill")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .medium))
                .foregroundStyle(DesignTokens.Success.default)
        case .celebrating:
            Image(systemName: "sparkles")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .medium))
                .foregroundStyle(DesignTokens.Warning.default)
        }
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

    // MARK: - Color Helpers

    private func outerRingSize(_ vm: TVAvatarViewModel) -> CGFloat {
        switch vm.currentState {
        case .idle: return 230
        case .listening: return 250
        case .thinking: return 220
        case .speaking: return 240
        case .celebrating: return 270
        }
    }

    private func outerRingColor(_ vm: TVAvatarViewModel) -> Color {
        switch vm.currentState {
        case .idle: return DesignTokens.Text.muted
        case .listening: return DesignTokens.Primary.default
        case .thinking: return DesignTokens.Warning.default
        case .speaking: return DesignTokens.Success.default
        case .celebrating: return DesignTokens.Warning.default
        }
    }

    private func orbCenterColor(_ vm: TVAvatarViewModel) -> Color {
        switch vm.currentState {
        case .idle: return DesignTokens.Glass.purpleLight
        case .listening: return DesignTokens.Primary.p400
        case .thinking: return DesignTokens.Warning.default.opacity(0.6)
        case .speaking: return DesignTokens.Success.default.opacity(0.6)
        case .celebrating: return DesignTokens.Warning.default.opacity(0.8)
        }
    }

    private func orbEdgeColor(_ vm: TVAvatarViewModel) -> Color {
        switch vm.currentState {
        case .idle: return DesignTokens.Glass.purpleStrong
        case .listening: return DesignTokens.Primary.default
        case .thinking: return DesignTokens.Glass.bgMedium
        case .speaking: return DesignTokens.Glass.bgMedium
        case .celebrating: return DesignTokens.Glass.purpleStrong
        }
    }
}
