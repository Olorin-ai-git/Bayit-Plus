import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// BYOC demo: three-step animated flow showing how Bring Your Own Content works.
/// Step 1: Add source -> Step 2: AI classification -> Step 3: Library integration
struct BYOCDemoView: View {
    @Environment(LocalizationManager.self) var localization
    @State private var currentStep = 0
    @State private var animating = false

    private let stepCount = 3

    var body: some View {
        VStack(spacing: 0) {
            headerSection
            stepVisualization
            stepDescription
            navigationButtons
        }
        .background(DesignTokens.Background.primary)
        .onAppear { startAnimation() }
    }

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("onboarding.tour.byoc.title"))
                .font(DesignTokens.Typography.title2)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            Text(localization.t("onboarding.tour.byoc.tagline"))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, DesignTokens.Spacing.xl)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var stepVisualization: some View {
        ZStack {
            stepContent(for: currentStep)
                .id(currentStep)
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .move(edge: .leading).combined(with: .opacity)
                ))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, DesignTokens.Spacing.lg)
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
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "plus.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Colors.accentPrimary)
                .scaleEffect(animating ? 1.1 : 1.0)
                .animation(.easeInOut(duration: 1.0).repeatForever(), value: animating)

            sourceRow(icon: "link", key: "onboarding.tour.byoc.sourceURL")
            sourceRow(icon: "doc.fill", key: "onboarding.tour.byoc.sourceFile")
            sourceRow(icon: "cloud.fill", key: "onboarding.tour.byoc.sourceCloud")
        }
    }

    private var classificationStep: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "brain.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Colors.accentPrimary)

            VStack(spacing: DesignTokens.Spacing.sm) {
                classificationRow(icon: "film", key: "onboarding.tour.byoc.classMovie")
                classificationRow(icon: "tv", key: "onboarding.tour.byoc.classSeries")
                classificationRow(icon: "music.note", key: "onboarding.tour.byoc.classMusic")
            }
        }
    }

    private var integrationStep: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(.green)

            Text(localization.t("onboarding.tour.byoc.integrated"))
                .font(DesignTokens.Typography.headline)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
        }
    }

    private func sourceRow(icon: String, key: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .frame(width: 24)
            Text(localization.t(key))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            Spacer()
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }

    private func classificationRow(icon: String, key: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .foregroundStyle(DesignTokens.Colors.accentPrimary)
            Text(localization.t(key))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            Spacer()
            Image(systemName: "checkmark")
                .foregroundStyle(.green)
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }

    private var stepDescription: some View {
        let keys = [
            "onboarding.tour.byoc.step1",
            "onboarding.tour.byoc.step2",
            "onboarding.tour.byoc.step3",
        ]
        return Text(localization.t(keys[currentStep]))
            .font(DesignTokens.Typography.callout)
            .foregroundStyle(DesignTokens.Colors.textSecondary)
            .multilineTextAlignment(.center)
            .padding(.horizontal, DesignTokens.Spacing.xl)
            .id(currentStep)
    }

    private var navigationButtons: some View {
        HStack(spacing: DesignTokens.Spacing.lg) {
            ForEach(0 ..< stepCount, id: \.self) { step in
                Circle()
                    .fill(
                        step == currentStep
                            ? DesignTokens.Colors.accentPrimary
                            : DesignTokens.Colors.textTertiary
                    )
                    .frame(width: step == currentStep ? 10 : 8)
                    .onTapGesture {
                        withAnimation { currentStep = step }
                    }
            }
        }
        .padding(.bottom, DesignTokens.Spacing.xl)
    }

    private func startAnimation() {
        animating = true
        autoAdvance()
    }

    private func autoAdvance() {
        let intervalSeconds = 3.0
        DispatchQueue.main.asyncAfter(deadline: .now() + intervalSeconds) {
            withAnimation {
                currentStep = (currentStep + 1) % stepCount
            }
            autoAdvance()
        }
    }
}
