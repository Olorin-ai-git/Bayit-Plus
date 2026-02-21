import BayitDesignSystem
import SwiftUI

// MARK: - TVAvatarModeView + Visualization & Colors

extension TVAvatarModeView {
    func avatarVisualization(_ vm: TVAvatarViewModel) -> some View {
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
    func stateIcon(_ vm: TVAvatarViewModel) -> some View {
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

    // MARK: - Color Helpers

    func outerRingSize(_ vm: TVAvatarViewModel) -> CGFloat {
        switch vm.currentState {
        case .idle: return 230
        case .listening: return 250
        case .thinking: return 220
        case .speaking: return 240
        case .celebrating: return 270
        }
    }

    func outerRingColor(_ vm: TVAvatarViewModel) -> Color {
        switch vm.currentState {
        case .idle: return DesignTokens.Text.muted
        case .listening: return DesignTokens.Primary.default
        case .thinking: return DesignTokens.Warning.default
        case .speaking: return DesignTokens.Success.default
        case .celebrating: return DesignTokens.Warning.default
        }
    }

    func orbCenterColor(_ vm: TVAvatarViewModel) -> Color {
        switch vm.currentState {
        case .idle: return DesignTokens.Glass.purpleLight
        case .listening: return DesignTokens.Primary.p400
        case .thinking: return DesignTokens.Warning.default.opacity(0.6)
        case .speaking: return DesignTokens.Success.default.opacity(0.6)
        case .celebrating: return DesignTokens.Warning.default.opacity(0.8)
        }
    }

    func orbEdgeColor(_ vm: TVAvatarViewModel) -> Color {
        switch vm.currentState {
        case .idle: return DesignTokens.Glass.purpleStrong
        case .listening: return DesignTokens.Primary.default
        case .thinking: return DesignTokens.Glass.bgMedium
        case .speaking: return DesignTokens.Glass.bgMedium
        case .celebrating: return DesignTokens.Glass.purpleStrong
        }
    }
}
