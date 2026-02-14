import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Full-screen AI avatar interaction view.
///
/// Displays an animated avatar visualization that responds to voice state
/// (idle, listening, thinking, speaking, celebrating). Includes a conversation
/// display area and a voice input button.
struct AvatarModeView: View {

    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: AvatarViewModel

    init(stateMachine: AvatarStateMachine, repository: any ChatRepository) {
        _viewModel = State(initialValue: AvatarViewModel(
            stateMachine: stateMachine,
            repository: repository
        ))
    }

    var body: some View {
        ZStack {
            backgroundGradient

            VStack(spacing: 0) {
                topBar
                avatarVisualization
                    .frame(maxHeight: .infinity, alignment: .center)
                conversationArea
                voiceInputBar
            }
        }
        .navigationBarBackButtonHidden(true)
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

    private var topBar: some View {
        HStack {
            Button {
                coordinator.pop()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Close avatar mode")

            Spacer()

            Text(localization.t("avatar.mode"))
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Button {
                coordinator.pushToCurrentTab(.avatarMode)
            } label: {
                Image(systemName: "gearshape")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Avatar preferences")
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
    }

    // MARK: - Avatar Visualization

    private var avatarVisualization: some View {
        ZStack {
            outerRing
            middleRing
            innerOrb
        }
        .animation(
            .spring(response: viewModel.springResponse, dampingFraction: 1.0 - viewModel.springBounce),
            value: viewModel.currentState
        )
    }

    private var outerRing: some View {
        Circle()
            .stroke(outerRingColor.opacity(0.2), lineWidth: 2)
            .frame(width: outerRingSize, height: outerRingSize)
            .scaleEffect(viewModel.currentState == .listening ? 1.15 : 1.0)
            .animation(
                viewModel.currentState == .listening
                    ? .easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                    : .easeInOut(duration: 0.4),
                value: viewModel.currentState
            )
    }

    private var middleRing: some View {
        Circle()
            .fill(outerRingColor.opacity(0.15))
            .frame(width: 140, height: 140)
            .scaleEffect(viewModel.currentState == .speaking ? 1.1 : 1.0)
            .animation(
                viewModel.currentState == .speaking
                    ? .easeInOut(duration: 0.8).repeatForever(autoreverses: true)
                    : .easeInOut(duration: 0.3),
                value: viewModel.currentState
            )
    }

    private var innerOrb: some View {
        ZStack {
            Circle()
                .fill(
                    RadialGradient(
                        colors: [orbCenterColor, orbEdgeColor],
                        center: .center,
                        startRadius: 0,
                        endRadius: 50
                    )
                )
                .frame(width: 100, height: 100)

            stateIcon
        }
        .scaleEffect(viewModel.currentState == .celebrating ? 1.2 : 1.0)
        .animation(
            viewModel.currentState == .celebrating
                ? .spring(response: 0.3, dampingFraction: 0.4).repeatCount(3, autoreverses: true)
                : .spring(response: 0.4, dampingFraction: 0.7),
            value: viewModel.currentState
        )
    }

    @ViewBuilder
    private var stateIcon: some View {
        switch viewModel.currentState {
        case .idle:
            Image(systemName: "waveform")
                .font(.system(size: 28, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
        case .listening:
            Image(systemName: "mic.fill")
                .font(.system(size: 28, weight: .medium))
                .foregroundStyle(DesignTokens.Primary.p300)
        case .thinking:
            ProgressView()
                .tint(DesignTokens.Text.primary)
                .scaleEffect(1.2)
        case .speaking:
            Image(systemName: "speaker.wave.3.fill")
                .font(.system(size: 28, weight: .medium))
                .foregroundStyle(DesignTokens.Success.default)
        case .celebrating:
            Image(systemName: "sparkles")
                .font(.system(size: 28, weight: .medium))
                .foregroundStyle(DesignTokens.Warning.default)
        }
    }

    // MARK: - Conversation Area

    private var conversationArea: some View {
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

    private func dialogueBubble(_ dialogue: AvatarDialogue) -> some View {
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

    private var typingIndicator: some View {
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

    // MARK: - Voice Input Bar

    private var voiceInputBar: some View {
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

    // MARK: - Computed Properties

    private var outerRingSize: CGFloat {
        switch viewModel.currentState {
        case .idle: return 180
        case .listening: return 200
        case .thinking: return 170
        case .speaking: return 190
        case .celebrating: return 220
        }
    }

    private var outerRingColor: Color {
        switch viewModel.currentState {
        case .idle: return DesignTokens.Text.muted
        case .listening: return DesignTokens.Primary.default
        case .thinking: return DesignTokens.Warning.default
        case .speaking: return DesignTokens.Success.default
        case .celebrating: return DesignTokens.Warning.default
        }
    }

    private var orbCenterColor: Color {
        switch viewModel.currentState {
        case .idle: return DesignTokens.Glass.purpleLight
        case .listening: return DesignTokens.Primary.p400
        case .thinking: return DesignTokens.Warning.default.opacity(0.6)
        case .speaking: return DesignTokens.Success.default.opacity(0.6)
        case .celebrating: return DesignTokens.Warning.default.opacity(0.8)
        }
    }

    private var orbEdgeColor: Color {
        switch viewModel.currentState {
        case .idle: return DesignTokens.Glass.purpleStrong
        case .listening: return DesignTokens.Primary.default
        case .thinking: return DesignTokens.Glass.bgMedium
        case .speaking: return DesignTokens.Glass.bgMedium
        case .celebrating: return DesignTokens.Glass.purpleStrong
        }
    }

    private var voiceButtonColor: Color {
        switch viewModel.currentState {
        case .listening: return DesignTokens.ErrorColor.default
        case .idle: return DesignTokens.Primary.default
        default: return DesignTokens.Glass.bgMedium
        }
    }

    private var voiceButtonIcon: String {
        switch viewModel.currentState {
        case .listening: return "stop.fill"
        case .idle: return "mic.fill"
        default: return "mic.slash"
        }
    }
}
