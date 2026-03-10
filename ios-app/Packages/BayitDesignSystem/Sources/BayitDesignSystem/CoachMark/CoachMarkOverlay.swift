import SwiftUI

public struct CoachMarkOverlayStep {
    public let instructionText: String
    public let targetFrame: CGRect
    public let targetCornerRadius: CGFloat

    public init(
        instructionText: String,
        targetFrame: CGRect,
        targetCornerRadius: CGFloat
    ) {
        self.instructionText = instructionText
        self.targetFrame = targetFrame
        self.targetCornerRadius = targetCornerRadius
    }
}

public struct CoachMarkOverlay: View {
    let steps: [CoachMarkOverlayStep]
    let currentStepIndex: Int
    let localize: (String) -> String
    let onNext: () -> Void
    let onSkip: () -> Void
    let onDone: () -> Void

    public init(
        steps: [CoachMarkOverlayStep],
        currentStepIndex: Int,
        localize: @escaping (String) -> String,
        onNext: @escaping () -> Void,
        onSkip: @escaping () -> Void,
        onDone: @escaping () -> Void
    ) {
        self.steps = steps
        self.currentStepIndex = currentStepIndex
        self.localize = localize
        self.onNext = onNext
        self.onSkip = onSkip
        self.onDone = onDone
    }

    private var isLastStep: Bool {
        currentStepIndex >= steps.count - 1
    }

    public var body: some View {
        if steps.indices.contains(currentStepIndex) {
            let step = steps[currentStepIndex]
            GeometryReader { geometry in
                ZStack {
                    spotlightBackground(step: step)
                    instructionContent(step: step, geometry: geometry)
                }
            }
            .ignoresSafeArea()
            .animation(.easeInOut, value: currentStepIndex)
        }
    }

    private func spotlightBackground(step: CoachMarkOverlayStep) -> some View {
        CoachMarkSpotlight(
            targetFrame: step.targetFrame,
            cornerRadius: step.targetCornerRadius
        )
        .fill(style: FillStyle(eoFill: true))
        .foregroundStyle(Color.black.opacity(Metrics.overlayOpacity))
        .accessibilityHidden(true)
    }

    @ViewBuilder
    private func instructionContent(step: CoachMarkOverlayStep, geometry: GeometryProxy) -> some View {
        let showAbove = step.targetFrame.midY > geometry.size.height / 2
        VStack(spacing: Metrics.contentSpacing) {
            if !showAbove {
                Spacer().frame(height: step.targetFrame.maxY + Metrics.contentSpacing)
            }
            instructionCard(step: step)
            if showAbove {
                let bottomGap = geometry.size.height
                    - step.targetFrame.minY + Metrics.contentSpacing
                Spacer().frame(height: bottomGap)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func instructionCard(step: CoachMarkOverlayStep) -> some View {
        VStack(spacing: Metrics.innerSpacing) {
            Text(step.instructionText)
                .font(.system(size: Metrics.instructionFontSize, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)
                .accessibilityAddTraits(.isStaticText)
            CoachMarkStep(
                currentStep: currentStepIndex + 1,
                totalSteps: steps.count,
                localize: localize
            )
            buttonRow
        }
        .padding(Metrics.cardPadding)
        .background(DesignTokens.Glass.bgStrong)
        .clipShape(RoundedRectangle(cornerRadius: Metrics.cardCornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: Metrics.cardCornerRadius)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .padding(.horizontal, Metrics.horizontalMargin)
    }

    private var buttonRow: some View {
        HStack(spacing: Metrics.buttonSpacing) {
            if isLastStep {
                coachMarkButton(
                    localize("discover.walkthrough.done"),
                    style: .primary,
                    label: localize("discover.walkthrough.doneAccessibility"),
                    action: onDone
                )
            } else {
                coachMarkButton(
                    localize("discover.walkthrough.skip"),
                    style: .ghost,
                    label: localize("discover.walkthrough.skipAccessibility"),
                    action: onSkip
                )
                coachMarkButton(
                    localize("discover.walkthrough.next"),
                    style: .primary,
                    label: localize("discover.walkthrough.nextAccessibility"),
                    action: onNext
                )
            }
        }
    }

    private enum ButtonStyle { case primary, ghost }

    @ViewBuilder
    private func coachMarkButton(
        _ title: String, style: ButtonStyle, label: String, action: @escaping () -> Void
    ) -> some View {
        #if os(tvOS)
            let weight: Font.Weight = style == .primary ? .bold : .medium
            let fg: Color = style == .primary ? .white : DesignTokens.Text.secondary
            let bg: Color = style == .primary
                ? DesignTokens.Primary.default : DesignTokens.Glass.bgMedium
            Button(action: action) {
                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: weight))
                    .foregroundStyle(fg)
                    .padding(.vertical, TVDesignTokens.Spacing.xs)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .background(bg)
                    .clipShape(Capsule())
            }
            .buttonStyle(.card)
            .accessibilityLabel(label)
        #else
            let variant: GlassButton.Variant = style == .primary ? .primary : .ghost
            GlassButton(title, variant: variant, size: .medium, action: action)
                .accessibilityLabel(label)
        #endif
    }
}

// MARK: - Platform-Adaptive Metrics

private enum Metrics {
    static let overlayOpacity: Double = 0.92
    #if os(tvOS)
        static let contentSpacing: CGFloat = TVDesignTokens.Spacing.lg
        static let innerSpacing: CGFloat = TVDesignTokens.Spacing.md
        static let cardPadding: CGFloat = TVDesignTokens.Spacing.xl
        static let cardCornerRadius: CGFloat = TVDesignTokens.Radius.lg
        static let horizontalMargin: CGFloat = TVDesignTokens.Spacing.xxxl
        static let buttonSpacing: CGFloat = TVDesignTokens.Spacing.md
        static let instructionFontSize: CGFloat = TVDesignTokens.FontSize.md
    #else
        static let contentSpacing: CGFloat = DesignTokens.Spacing.lg
        static let innerSpacing: CGFloat = DesignTokens.Spacing.md
        static let cardPadding: CGFloat = DesignTokens.Spacing.xl
        static let cardCornerRadius: CGFloat = DesignTokens.Radius.lg
        static let horizontalMargin: CGFloat = DesignTokens.Spacing.xxl
        static let buttonSpacing: CGFloat = DesignTokens.Spacing.md
        static let instructionFontSize: CGFloat = DesignTokens.FontSize.md
    #endif
}
