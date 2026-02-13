import BayitDesignSystem
import SwiftUI

struct CulturalContextBadge: View {
    let referenceName: String
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button {
            onTap()
        } label: {
            HStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: "info.circle.fill")
                    .font(.caption2)
                    .foregroundStyle(DesignTokens.Warning.default)
                Text(referenceName)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xxs)
            .background(
                isSelected
                    ? DesignTokens.Warning.default.opacity(0.25)
                    : DesignTokens.Glass.bg.opacity(0.7)
            )
            .clipShape(Capsule())
            .overlay(
                Capsule().stroke(
                    isSelected
                        ? DesignTokens.Warning.default.opacity(0.6)
                        : Color.clear,
                    lineWidth: 1
                )
            )
        }
        .buttonStyle(.plain)
    }
}
