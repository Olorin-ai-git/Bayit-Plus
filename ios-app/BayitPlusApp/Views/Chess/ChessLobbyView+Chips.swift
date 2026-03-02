import BayitDesignSystem
import SwiftUI

extension ChessLobbyView {
    func chipButton(
        label: String, isSelected: Bool, accent: Color = DesignTokens.Gradient.ctaStart,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(isSelected ? DesignTokens.Text.primary : DesignTokens.Text.muted)
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(isSelected ? accent.opacity(0.3) : DesignTokens.Glass.bgLight)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(isSelected ? accent.opacity(0.6) : Color.clear, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
