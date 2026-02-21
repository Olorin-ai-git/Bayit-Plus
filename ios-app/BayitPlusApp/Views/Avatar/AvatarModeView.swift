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
    @State var viewModel: AvatarViewModel

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
                DesignTokens.Background.primary,
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
}
