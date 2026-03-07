import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Adaptive onboarding wizard for BYOC content import.
/// Step 1: Source input (always) -> Step 2: AI summary (always)
/// -> Step 3: Content pruning (if duplicates) -> Step 4: Personalization (if multi-language)
struct BYOCOnboardingWizardView: View {
    @Environment(BYOCSourceManager.self) private var byocManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.dismiss) private var dismiss

    @State private var currentStep = 0
    @State private var plan: NormalizationPlan?
    @State private var isAnalyzing = false
    @State private var analysisProgress: Double = 0
    @State private var analysisStage = ""
    @State private var error: String?

    private var totalSteps: Int {
        guard let plan else { return 2 }
        var steps = 2
        if plan.stats.duplicatesFound > plan.stats.total / 20
            || plan.unresolved.count > 50
        {
            steps += 1
        }
        if plan.detectedLanguages.count > 1
            || plan.suggestedCategories.count > 3
        {
            steps += 1
        }
        return steps
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                stepIndicator
                    .padding(.top, DesignTokens.Spacing.md)

                Group {
                    switch currentStep {
                    case 0:
                        sourceInputStep
                    case 1:
                        analysisSummaryStep
                    case 2:
                        contentPruningStep
                    default:
                        personalizationStep
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("byoc.onboarding.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.cancel")) { dismiss() }
                }
            }
        }
    }

    // MARK: - Step Indicator

    private var stepIndicator: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(0 ..< totalSteps, id: \.self) { step in
                Capsule()
                    .fill(step <= currentStep
                        ? DesignTokens.Primary.default
                        : DesignTokens.Background.elevated)
                    .frame(height: 4)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Step 1: Source Input

    private var sourceInputStep: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Text(localization.t("byoc.onboarding.connectSource"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("byoc.onboarding.connectDesc"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Spacer()

            Text(localization.t("byoc.onboarding.sourceAdded"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)

            Button {
                Task { await startAnalysis() }
            } label: {
                HStack {
                    Spacer()
                    if isAnalyzing {
                        ProgressView()
                            .tint(.white)
                            .padding(.trailing, DesignTokens.Spacing.sm)
                        Text(localization.t("byoc.onboarding.analyzing"))
                    } else {
                        Text(localization.t("byoc.onboarding.analyze"))
                    }
                    Spacer()
                }
                .padding()
                .background(DesignTokens.Primary.default)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(!byocManager.hasAnySources || isAnalyzing)
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.xl)
        }
    }

    // MARK: - Step 2: AI Analysis Summary

    private var analysisSummaryStep: some View {
        BYOCAnalysisSummaryStep(
            plan: plan,
            onContinue: { advanceStep() }
        )
    }

    // MARK: - Step 3: Content Pruning

    private var contentPruningStep: some View {
        BYOCContentPruningStep(
            plan: plan,
            onContinue: { advanceStep() },
            onSkip: { advanceStep() }
        )
    }

    // MARK: - Step 4: Personalization

    private var personalizationStep: some View {
        BYOCPersonalizationStep(
            plan: plan,
            onComplete: { dismiss() }
        )
    }

    // MARK: - Actions

    private func advanceStep() {
        withAnimation {
            currentStep = min(currentStep + 1, totalSteps - 1)
        }
    }

    private func startAnalysis() async {
        isAnalyzing = true
        error = nil

        let allChannels = byocManager.iptvChannels + byocManager.xtreamChannels
        let allVOD = byocManager.xtreamVODItems + byocManager.plexItems
        let allSeries = byocManager.xtreamSeriesItems

        let sourceType = byocManager.hasXtream ? "xtream" : "iptv"
        let manifest = BYOCManifestBuilder.build(
            channels: allChannels,
            vodItems: allVOD,
            seriesItems: allSeries,
            sourceType: sourceType
        )

        guard let baseURL = URL(string: "https://api.bayit.tv") else { return }
        let normService = BYOCNormalizationService(baseURL: baseURL)

        do {
            let jobId = try await normService.submitManifest(manifest)
            plan = try await normService.pollUntilComplete(jobId: jobId) {
                progress, stage in
                Task { @MainActor in
                    analysisProgress = progress
                    analysisStage = stage
                }
            }
            isAnalyzing = false
            advanceStep()
        } catch {
            self.error = error.localizedDescription
            isAnalyzing = false
        }
    }
}
