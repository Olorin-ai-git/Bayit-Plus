import SwiftUI

/// Glass-styled button matching the @bayit/glass GlassButton component
public struct GlassButton: View {
    public enum Variant {
        case primary
        case secondary
        case ghost
        case destructive
        case gradient
        case light
    }

    public enum Size {
        case small
        case medium
        case large

        var verticalPadding: CGFloat {
            #if os(tvOS)
                switch self {
                case .small: return TVDesignTokens.Spacing.xs
                case .medium: return TVDesignTokens.Spacing.sm
                case .large: return TVDesignTokens.Spacing.md
                }
            #else
                switch self {
                case .small: return DesignTokens.Spacing.sm
                case .medium: return DesignTokens.Spacing.md
                case .large: return DesignTokens.Spacing.base
                }
            #endif
        }

        var horizontalPadding: CGFloat {
            #if os(tvOS)
                switch self {
                case .small: return TVDesignTokens.Spacing.md
                case .medium: return TVDesignTokens.Spacing.lg
                case .large: return TVDesignTokens.Spacing.xl
                }
            #else
                switch self {
                case .small: return DesignTokens.Spacing.md
                case .medium: return DesignTokens.Spacing.lg
                case .large: return DesignTokens.Spacing.xl
                }
            #endif
        }

        var fontSize: CGFloat {
            #if os(tvOS)
                switch self {
                case .small: return TVDesignTokens.FontSize.xs
                case .medium: return TVDesignTokens.FontSize.sm
                case .large: return TVDesignTokens.FontSize.md
                }
            #else
                switch self {
                case .small: return DesignTokens.FontSize.sm
                case .medium: return DesignTokens.FontSize.base
                case .large: return DesignTokens.FontSize.md
                }
            #endif
        }
    }

    let title: String
    let variant: Variant
    let size: Size
    let isDisabled: Bool
    let isLoading: Bool
    let icon: Image?
    let action: () -> Void

    public init(
        _ title: String,
        variant: Variant = .primary,
        size: Size = .medium,
        isDisabled: Bool = false,
        isLoading: Bool = false,
        icon: Image? = nil,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.variant = variant
        self.size = size
        self.isDisabled = isDisabled
        self.isLoading = isLoading
        self.icon = icon
        self.action = action
    }

    @Environment(\.isEnabled) private var isEnabled

    private var effectivelyDisabled: Bool {
        isDisabled || isLoading || !isEnabled
    }

    public var body: some View {
        Button(action: action) {
            buttonLabel
        }
        .disabled(isDisabled || isLoading)
        .opacity(effectivelyDisabled ? 0.5 : 1.0)
        #if os(tvOS)
            .buttonStyle(GlassButtonTVStyle())
            .focusEffectDisabled()
        #else
            .buttonStyle(GlassPressStyle())
        #endif
    }

    private var buttonLabel: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            if isLoading {
                ProgressView()
                    .tint(DesignTokens.Text.primary)
                    .scaleEffect(0.8)
            } else if let icon {
                icon
                    .font(.system(size: size.fontSize))
            }

            Text(title)
                .font(.system(size: size.fontSize, weight: fontWeight))
        }
        .padding(.vertical, size.verticalPadding)
        .padding(.horizontal, size.horizontalPadding)
        .frame(maxWidth: maxLabelWidth)
        .foregroundStyle(foregroundColor)
        .background(background)
        #if os(tvOS)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(borderColor, lineWidth: borderLineWidth))
        #else
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(borderColor, lineWidth: borderLineWidth)
            )
        #endif
    }

    private var fontWeight: Font.Weight {
        #if os(tvOS)
            return variant == .primary || variant == .destructive ? .bold : .semibold
        #else
            return .semibold
        #endif
    }

    private var maxLabelWidth: CGFloat? {
        #if os(tvOS)
            return nil
        #else
            return (variant == .ghost) ? nil : .infinity
        #endif
    }

    @ViewBuilder
    private var background: some View {
        switch variant {
        case .primary:
            DesignTokens.Primary.default
        case .secondary:
            DesignTokens.Glass.bgMedium
        case .ghost:
            Color.clear
        case .destructive:
            DesignTokens.ErrorColor.default
        case .gradient:
            DesignTokens.Gradient.ctaLinear
        case .light:
            Color.white
        }
    }

    private var foregroundColor: Color {
        switch variant {
        case .primary, .destructive, .gradient:
            return .white
        case .secondary:
            return DesignTokens.Text.primary
        case .ghost:
            return DesignTokens.Primary.p400
        case .light:
            return Color(red: 0.1, green: 0.1, blue: 0.1)
        }
    }

    private var borderColor: Color {
        switch variant {
        case .primary:
            return DesignTokens.Primary.p600
        case .secondary:
            return DesignTokens.Glass.border
        case .ghost, .gradient:
            return .clear
        case .light:
            return Color.white.opacity(0.2)
        case .destructive:
            return DesignTokens.ErrorColor.e600
        }
    }

    private var borderLineWidth: CGFloat {
        switch variant {
        case .primary, .destructive, .gradient: return 0
        case .light: return 1
        case .secondary, .ghost: return 1
        }
    }
}

// MARK: - iOS Press Style

#if !os(tvOS)
    struct GlassPressStyle: ButtonStyle {
        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
                .brightness(configuration.isPressed ? -0.05 : 0)
                .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
        }
    }
#endif

// MARK: - tvOS Button Style

#if os(tvOS)
    /// ButtonStyle for GlassButton on tvOS — matches the hero carousel capsule
    /// button look with brightness lift on focus, purple glow shadow, and scale.
    struct GlassButtonTVStyle: ButtonStyle {
        @Environment(\.isFocused) private var isFocused

        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .focusEffectDisabled()
                .brightness(isFocused ? 0.22 : 0)
                .overlay(
                    Capsule()
                        .stroke(
                            isFocused ? DesignTokens.Glass.borderFocus : Color.clear,
                            lineWidth: TVDesignTokens.Focus.ringWidth
                        )
                )
                .scaleEffect(
                    isFocused
                        ? TVDesignTokens.Focus.scaleAmount
                        : (configuration.isPressed ? 0.97 : 1.0)
                )
                .shadow(
                    color: isFocused ? DesignTokens.Glass.purpleGlow : .clear,
                    radius: TVDesignTokens.Focus.shadowRadius,
                    x: 0,
                    y: isFocused ? 6 : 0
                )
                .animation(
                    .easeInOut(duration: TVDesignTokens.Focus.animationDuration),
                    value: isFocused
                )
                .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
        }
    }
#endif
