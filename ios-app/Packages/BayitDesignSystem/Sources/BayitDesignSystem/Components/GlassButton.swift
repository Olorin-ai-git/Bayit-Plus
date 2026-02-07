import SwiftUI

/// Glass-styled button matching the @bayit/glass GlassButton component
public struct GlassButton: View {
    public enum Variant {
        case primary
        case secondary
        case ghost
        case destructive
    }

    public enum Size {
        case small
        case medium
        case large

        var verticalPadding: CGFloat {
            switch self {
            case .small: return DesignTokens.Spacing.sm
            case .medium: return DesignTokens.Spacing.md
            case .large: return DesignTokens.Spacing.base
            }
        }

        var horizontalPadding: CGFloat {
            switch self {
            case .small: return DesignTokens.Spacing.md
            case .medium: return DesignTokens.Spacing.lg
            case .large: return DesignTokens.Spacing.xl
            }
        }

        var fontSize: CGFloat {
            switch self {
            case .small: return DesignTokens.FontSize.sm
            case .medium: return DesignTokens.FontSize.base
            case .large: return DesignTokens.FontSize.md
            }
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

    public var body: some View {
        Button(action: action) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.8)
                } else if let icon {
                    icon
                        .font(.system(size: size.fontSize))
                }

                Text(title)
                    .font(.system(size: size.fontSize, weight: .semibold))
            }
            .padding(.vertical, size.verticalPadding)
            .padding(.horizontal, size.horizontalPadding)
            .frame(maxWidth: variant == .ghost ? nil : .infinity)
            .foregroundStyle(foregroundColor)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(borderColor, lineWidth: 1)
            )
        }
        .disabled(isDisabled || isLoading)
        .opacity(isDisabled ? 0.5 : 1.0)
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
        }
    }

    private var foregroundColor: Color {
        switch variant {
        case .primary, .destructive:
            return .white
        case .secondary:
            return DesignTokens.Text.primary
        case .ghost:
            return DesignTokens.Primary.p400
        }
    }

    private var borderColor: Color {
        switch variant {
        case .primary:
            return DesignTokens.Primary.p600
        case .secondary:
            return DesignTokens.Glass.border
        case .ghost:
            return .clear
        case .destructive:
            return DesignTokens.ErrorColor.e600
        }
    }
}
