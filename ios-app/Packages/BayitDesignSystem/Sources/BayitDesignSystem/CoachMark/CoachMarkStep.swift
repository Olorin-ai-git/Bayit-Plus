import SwiftUI

public struct CoachMarkStep: View {
    let currentStep: Int
    let totalSteps: Int
    let localize: (String) -> String

    public init(currentStep: Int, totalSteps: Int, localize: @escaping (String) -> String) {
        self.currentStep = currentStep
        self.totalSteps = totalSteps
        self.localize = localize
    }

    public var body: some View {
        let counter = localize("discover.walkthrough.stepCounter")
            .replacingOccurrences(of: "{{current}}", with: "\(currentStep)")
            .replacingOccurrences(of: "{{total}}", with: "\(totalSteps)")
        let a11y = localize("discover.walkthrough.stepAccessibility")
            .replacingOccurrences(of: "{{current}}", with: "\(currentStep)")
            .replacingOccurrences(of: "{{total}}", with: "\(totalSteps)")
        Text(counter)
            .font(.system(size: fontSize, weight: .medium))
            .foregroundStyle(DesignTokens.Text.muted)
            .padding(.horizontal, horizontalPadding)
            .padding(.vertical, verticalPadding)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(Capsule())
            .accessibilityLabel(a11y)
    }

    private var fontSize: CGFloat {
        #if os(tvOS)
            return TVDesignTokens.FontSize.sm
        #else
            return DesignTokens.FontSize.sm
        #endif
    }

    private var horizontalPadding: CGFloat {
        #if os(tvOS)
            return TVDesignTokens.Spacing.md
        #else
            return DesignTokens.Spacing.md
        #endif
    }

    private var verticalPadding: CGFloat {
        #if os(tvOS)
            return TVDesignTokens.Spacing.xs
        #else
            return DesignTokens.Spacing.xs
        #endif
    }
}
