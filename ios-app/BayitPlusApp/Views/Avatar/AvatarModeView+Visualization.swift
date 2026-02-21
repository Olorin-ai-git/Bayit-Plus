import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Avatar Visualization and Computed Properties

extension AvatarModeView {
    var avatarVisualization: some View {
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

    var outerRing: some View {
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

    var middleRing: some View {
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

    var innerOrb: some View {
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
    var stateIcon: some View {
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

    // MARK: - Computed Properties

    var outerRingSize: CGFloat {
        switch viewModel.currentState {
        case .idle: return 180
        case .listening: return 200
        case .thinking: return 170
        case .speaking: return 190
        case .celebrating: return 220
        }
    }

    var outerRingColor: Color {
        switch viewModel.currentState {
        case .idle: return DesignTokens.Text.muted
        case .listening: return DesignTokens.Primary.default
        case .thinking: return DesignTokens.Warning.default
        case .speaking: return DesignTokens.Success.default
        case .celebrating: return DesignTokens.Warning.default
        }
    }

    var orbCenterColor: Color {
        switch viewModel.currentState {
        case .idle: return DesignTokens.Glass.purpleLight
        case .listening: return DesignTokens.Primary.p400
        case .thinking: return DesignTokens.Warning.default.opacity(0.6)
        case .speaking: return DesignTokens.Success.default.opacity(0.6)
        case .celebrating: return DesignTokens.Warning.default.opacity(0.8)
        }
    }

    var orbEdgeColor: Color {
        switch viewModel.currentState {
        case .idle: return DesignTokens.Glass.purpleStrong
        case .listening: return DesignTokens.Primary.default
        case .thinking: return DesignTokens.Glass.bgMedium
        case .speaking: return DesignTokens.Glass.bgMedium
        case .celebrating: return DesignTokens.Glass.purpleStrong
        }
    }

    var voiceButtonColor: Color {
        switch viewModel.currentState {
        case .listening: return DesignTokens.ErrorColor.default
        case .idle: return DesignTokens.Primary.default
        default: return DesignTokens.Glass.bgMedium
        }
    }

    var voiceButtonIcon: String {
        switch viewModel.currentState {
        case .listening: return "stop.fill"
        case .idle: return "mic.fill"
        default: return "mic.slash"
        }
    }
}
