import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS BYOC demo: three-step animated flow with focus navigation
/// between steps. Step 1: Add source, Step 2: AI classify, Step 3: Integrated.
struct TVBYOCDemoView: View {
    @Environment(LocalizationManager.self) var localization
    @State private var currentStep = 0
    @State private var animating = false

    private let stepCount = 3

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            headerSection
            stepVisualization
            stepDescription
            stepNavigation
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear { animating = true }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Text(localization.t("onboarding.tour.byoc.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("onboarding.tour.byoc.tagline"))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    // MARK: - Step Visualization

    private var stepVisualization: some View {
        ZStack {
            stepContent(for: currentStep)
                .id(currentStep)
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .move(edge: .leading).combined(with: .opacity)
                ))
        }
        .frame(maxWidth: 700, maxHeight: .infinity)
        .animation(.spring(response: 0.5), value: currentStep)
    }

    @ViewBuilder
    private func stepContent(for step: Int) -> some View {
        switch step {
        case 0: addSourceStep
        case 1: classificationStep
        default: integrationStep
        }
    }

    private var addSourceStep: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "plus.circle.fill")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Colors.Primary.base)
                .scaleEffect(animating ? 1.1 : 1.0)
                .animation(
                    .easeInOut(duration: 1.0).repeatForever(),
                    value: animating
                )

            sourceRow(icon: "link", key: "onboarding.tour.byoc.sourceURL")
            sourceRow(icon: "doc.fill", key: "onboarding.tour.byoc.sourceFile")
            sourceRow(icon: "cloud.fill", key: "onboarding.tour.byoc.sourceCloud")
        }
    }

    private var classificationStep: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "brain.fill")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Colors.Primary.base)

            classRow(icon: "film", key: "onboarding.tour.byoc.classMovie")
            classRow(icon: "tv", key: "onboarding.tour.byoc.classSeries")
            classRow(icon: "music.note", key: "onboarding.tour.byoc.classMusic")
        }
    }

    private var integrationStep: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(.green)

            Text(localization.t("onboarding.tour.byoc.integrated"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Row Helpers

    private func sourceRow(icon: String, key: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .frame(width: 40)
            Text(localization.t(key))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }

    private func classRow(icon: String, key: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Colors.Primary.base)
            Text(localization.t(key))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
            Image(systemName: "checkmark")
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(.green)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }

    // MARK: - Step Description

    private var stepDescription: some View {
        let keys = [
            "onboarding.tour.byoc.step1",
            "onboarding.tour.byoc.step2",
            "onboarding.tour.byoc.step3",
        ]
        return Text(localization.t(keys[currentStep]))
            .font(.system(size: TVDesignTokens.FontSize.base))
            .foregroundStyle(DesignTokens.Text.secondary)
            .multilineTextAlignment(.center)
            .id(currentStep)
    }

    // MARK: - Step Navigation

    private var stepNavigation: some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(0 ..< stepCount, id: \.self) { step in
                Button {
                    withAnimation { currentStep = step }
                } label: {
                    Circle()
                        .fill(
                            step == currentStep
                                ? DesignTokens.Colors.Primary.base
                                : DesignTokens.Text.muted
                        )
                        .frame(
                            width: step == currentStep ? 16 : 12,
                            height: step == currentStep ? 16 : 12
                        )
                        .padding(TVDesignTokens.Spacing.md)
                }
                .buttonStyle(.card)
            }
        }
        .padding(.bottom, TVDesignTokens.Spacing.lg)
    }
}
