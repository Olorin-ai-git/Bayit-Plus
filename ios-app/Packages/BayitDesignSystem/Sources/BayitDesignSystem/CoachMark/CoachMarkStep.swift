import SwiftUI

/// Step indicator displaying progress through coach mark steps
/// as "currentStep of totalSteps" text.
public struct CoachMarkStep: View {
    let currentStep: Int
    let totalSteps: Int

    public init(currentStep: Int, totalSteps: Int) {
        self.currentStep = currentStep
        self.totalSteps = totalSteps
    }

    public var body: some View {
        Text("\(currentStep) of \(totalSteps)")
            .font(.system(size: fontSize, weight: .medium))
            .foregroundStyle(DesignTokens.Text.muted)
            .padding(.horizontal, horizontalPadding)
            .padding(.vertical, verticalPadding)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(Capsule())
            .accessibilityLabel("Step \(currentStep) of \(totalSteps)")
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
