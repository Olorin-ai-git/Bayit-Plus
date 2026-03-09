import BayitDesignSystem
import SwiftUI

/// Arrow direction for tooltip positioning.
enum TooltipArrowDirection {
    case top, bottom, leading, trailing
}

/// Glass-styled contextual tooltip with arrow and dismiss action.
struct GlassTooltip: View {
    let title: String?
    let message: String
    let arrowDirection: TooltipArrowDirection
    let onDismiss: () -> Void

    init(
        title: String? = nil,
        message: String,
        arrowDirection: TooltipArrowDirection,
        onDismiss: @escaping () -> Void
    ) {
        self.title = title
        self.message = message
        self.arrowDirection = arrowDirection
        self.onDismiss = onDismiss
    }

    var body: some View {
        VStack(spacing: 0) {
            if arrowDirection == .bottom {
                tooltipContent
                arrowTriangle
            } else if arrowDirection == .top {
                arrowTriangle
                tooltipContent
            } else {
                HStack(spacing: 0) {
                    if arrowDirection == .trailing {
                        tooltipContent
                        arrowTriangle
                    } else {
                        arrowTriangle
                        tooltipContent
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
        .accessibilityAddTraits(.isStaticText)
        .accessibilityAction(.escape) { onDismiss() }
    }

    private var accessibilityText: String {
        if let title { return "\(title). \(message)" }
        return message
    }

    private var tooltipContent: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                if let title {
                    Text(title)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
                Text(message)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.leading)
            }

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .accessibilityLabel("Dismiss")
        }
        .padding(DesignTokens.Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
        )
    }

    private var arrowTriangle: some View {
        Triangle()
            .fill(.ultraThinMaterial)
            .frame(width: 16, height: 8)
            .rotationEffect(arrowRotation)
    }

    private var arrowRotation: Angle {
        switch arrowDirection {
        case .top: .degrees(180)
        case .bottom: .degrees(0)
        case .leading: .degrees(90)
        case .trailing: .degrees(-90)
        }
    }
}

// MARK: - Triangle Shape

private struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        Path { path in
            path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
            path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
            path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
            path.closeSubpath()
        }
    }
}
