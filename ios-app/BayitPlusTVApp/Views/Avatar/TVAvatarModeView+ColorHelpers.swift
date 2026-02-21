import BayitDesignSystem
import SwiftUI

// MARK: - TVAvatarModeView + Color Helpers

extension TVAvatarModeView {
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
