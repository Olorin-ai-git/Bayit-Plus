import BayitDesignSystem
import SwiftUI

struct CulturalContextBadge: View {
    let referenceName: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: "info.circle.fill")
                    .font(.caption2)
                    .foregroundStyle(DesignTokens.Colors.warning)
                Text(referenceName)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .lineLimit(1)
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xxs)
            .background(
                isSelected
                    ? DesignTokens.Colors.warning.opacity(0.25)
                    : DesignTokens.Colors.surface.opacity(0.7)
            )
            .clipShape(Capsule())
            .overlay(
                Capsule().stroke(
                    isSelected
                        ? DesignTokens.Colors.warning.opacity(0.6)
                        : Color.clear,
                    lineWidth: 1
                )
            )
        }
        .buttonStyle(.plain)
    }
}
