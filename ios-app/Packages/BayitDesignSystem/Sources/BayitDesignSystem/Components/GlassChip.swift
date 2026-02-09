import SwiftUI

/// Filter chip/tag component with selection state
/// Used for category filters, tags, and multi-select options
public struct GlassChip: View {
    let title: String
    let isSelected: Bool
    let onTap: () -> Void

    public init(
        title: String,
        isSelected: Bool = false,
        onTap: @escaping () -> Void
    ) {
        self.title = title
        self.isSelected = isSelected
        self.onTap = onTap
    }

    public var body: some View {
        Button(action: onTap) {
            Text(title)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundColor(isSelected ? DesignTokens.Text.primary : DesignTokens.Text.secondary)
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background {
                    if isSelected {
                        ZStack {
                            DesignTokens.Primary.default
                            VisualEffectBlur()
                                .opacity(0.3)
                        }
                    } else {
                        ZStack {
                            DesignTokens.Glass.bg
                            VisualEffectBlur()
                        }
                    }
                }
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .stroke(
                            isSelected ? DesignTokens.Primary.default : DesignTokens.Glass.border,
                            lineWidth: isSelected ? 1.5 : 1
                        )
                )
        }
        .buttonStyle(ChipButtonStyle())
    }
}

private struct ChipButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}
