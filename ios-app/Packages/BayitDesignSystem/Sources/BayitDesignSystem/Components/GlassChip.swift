import SwiftUI

/// Filter chip/tag component with selection state
/// Used for category filters, tags, and multi-select options
public struct GlassChip: View {
    let title: String
    let isSelected: Bool
    let onTap: () -> Void

    #if os(tvOS)
        @Environment(\.isFocused) private var isFocused
    #endif

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
            #if os(tvOS)
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
            #else
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
            #endif
                .foregroundColor(isSelected ? DesignTokens.Text.primary : DesignTokens.Text.secondary)
            #if os(tvOS)
                .padding(.horizontal, TVDesignTokens.Spacing.base)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
            #else
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.sm)
            #endif
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
                            chipBorderColor,
                            lineWidth: chipBorderWidth
                        )
                )
        }
        .buttonStyle(ChipButtonStyle())
        #if os(tvOS)
            .focusEffectDisabled()
        #endif
    }

    private var chipBorderColor: Color {
        #if os(tvOS)
            if isFocused {
                return DesignTokens.Glass.borderFocus
            }
        #endif
        return isSelected ? DesignTokens.Primary.default : DesignTokens.Glass.border
    }

    private var chipBorderWidth: CGFloat {
        #if os(tvOS)
            if isFocused {
                return TVDesignTokens.Focus.ringWidth
            }
        #endif
        return isSelected ? 1.5 : 1
    }
}

private struct ChipButtonStyle: ButtonStyle {
    #if os(tvOS)
        @Environment(\.isFocused) private var isFocused
    #endif

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
        #if os(tvOS)
            .focusEffectDisabled()
            .scaleEffect(
                isFocused
                    ? TVDesignTokens.Focus.scaleAmount
                    : (configuration.isPressed ? 0.97 : 1.0)
            )
            .shadow(
                color: isFocused
                    ? DesignTokens.Glass.purpleGlow.opacity(0.5)
                    : Color.clear,
                radius: TVDesignTokens.Focus.shadowRadius,
                x: 0,
                y: isFocused ? 6 : 0
            )
            .animation(
                .spring(
                    duration: TVDesignTokens.Focus.animationDuration,
                    bounce: 0.2
                ),
                value: isFocused
            )
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
        #else
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
        #endif
    }
}
