#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS adaptive onboarding wizard for BYOC content import.
    /// Optimized for Siri Remote: large text, button-based navigation, no text input.
    struct TVBYOCOnboardingWizardView: View {
        @Environment(BYOCSourceManager.self) var byocManager
        @Environment(LocalizationManager.self) var localization
        let onDismiss: () -> Void

        @State private var currentStep = 0
        @State private var plan: NormalizationPlan?
        @State private var isAnalyzing = false
        @State private var analysisProgress: Double = 0
        @State private var autoSelectBest = true
        @State private var enabledCategories: Set<String> = []

        private var totalSteps: Int {
            guard let plan else { return 2 }
            var steps = 2
            if plan.stats.duplicatesFound > plan.stats.total / 20
                || plan.unresolved.count > 50
            { steps += 1 }
            if plan.detectedLanguages.count > 1
                || plan.suggestedCategories.count > 3
            { steps += 1 }
            return steps
        }

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    stepIndicator
                    Group {
                        switch currentStep {
                        case 0: analyzeStep
                        case 1: summaryStep
                        case 2: pruningStep
                        default: personalizationStep
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .padding(TVDesignTokens.Spacing.xxl)
            }
        }

        // MARK: - Step Indicator

        private var stepIndicator: some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                ForEach(0 ..< totalSteps, id: \.self) { step in
                    Capsule()
                        .fill(step <= currentStep
                            ? DesignTokens.Primary.p400
                            : DesignTokens.Background.elevated)
                        .frame(height: 6)
                }
            }
        }

        // MARK: - Step 0: Analyze

        private var analyzeStep: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Image(systemName: "wand.and.stars")
                    .font(.system(size: 80))
                    .foregroundStyle(DesignTokens.Primary.p400)

                Text(localization.t("byoc.onboarding.connectSource"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("byoc.onboarding.connectDesc"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)

                Spacer()

                if isAnalyzing {
                    VStack(spacing: TVDesignTokens.Spacing.md) {
                        ProgressView(value: analysisProgress)
                            .tint(DesignTokens.Primary.p400)
                            .frame(maxWidth: 400)
                        Text(localization.t("byoc.onboarding.analyzing"))
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                } else {
                    HStack(spacing: TVDesignTokens.Spacing.lg) {
                        Button(localization.t("common.cancel")) { onDismiss() }
                            .tvCardStyle()

                        Button {
                            Task { await startAnalysis() }
                        } label: {
                            Text(localization.t("byoc.onboarding.analyze"))
                                .fontWeight(.semibold)
                        }
                        .disabled(!byocManager.hasAnySources)
                        .tvCardStyle()
                    }
                }
            }
        }

        // MARK: - Step 1: Summary

        private var summaryStep: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                if let plan {
                    Text(localization.t("byoc.onboarding.analysisComplete"))
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    HStack(spacing: TVDesignTokens.Spacing.xl) {
                        statCard(
                            icon: "checkmark.circle.fill",
                            color: .green,
                            value: "\(plan.stats.matchedChannels)",
                            label: localization.t("byoc.onboarding.channelsIdentified")
                        )
                        if plan.stats.matchedVod > 0 {
                            statCard(
                                icon: "film.fill",
                                color: .blue,
                                value: "\(plan.stats.matchedVod)",
                                label: localization.t("byoc.onboarding.vodMatched")
                            )
                        }
                        if plan.stats.duplicatesFound > 0 {
                            statCard(
                                icon: "doc.on.doc.fill",
                                color: .orange,
                                value: "\(plan.stats.duplicatesFound)",
                                label: localization.t("byoc.onboarding.duplicatesFound")
                            )
                        }
                        if let health = plan.healthSample, health.tested > 0 {
                            let pct = Int(Double(health.alive) / Double(health.tested) * 100)
                            statCard(
                                icon: "heart.fill",
                                color: pct > 80 ? .green : .orange,
                                value: "\(pct)%",
                                label: localization.t("byoc.onboarding.streamsHealthy")
                            )
                        }
                    }

                    if !plan.suggestedCategories.isEmpty {
                        Text(plan.suggestedCategories.prefix(5).joined(separator: " / "))
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }

                    Spacer()

                    Button {
                        advanceStep()
                    } label: {
                        Text(localization.t("common.continue"))
                            .fontWeight(.semibold)
                    }
                    .tvCardStyle()
                } else {
                    ProgressView()
                }
            }
        }

        // MARK: - Step 2: Pruning

        private var pruningStep: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Text(localization.t("byoc.onboarding.cleanupTitle"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                if let plan {
                    Toggle(isOn: $autoSelectBest) {
                        Text(localization.t("byoc.onboarding.autoBestQuality"))
                            .font(.system(size: TVDesignTokens.FontSize.md))
                    }
                    .tint(DesignTokens.Primary.p400)
                    .padding()
                    .background(DesignTokens.Background.elevated)
                    .clipShape(RoundedRectangle(cornerRadius: 16))

                    ScrollView(.horizontal) {
                        HStack(spacing: TVDesignTokens.Spacing.md) {
                            ForEach(
                                Array(plan.duplicates.prefix(10).enumerated()),
                                id: \.offset
                            ) { _, group in
                                tvDuplicateCard(group)
                            }
                        }
                    }
                }

                Spacer()

                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Button(localization.t("common.skip")) { advanceStep() }
                        .tvCardStyle()

                    Button {
                        advanceStep()
                    } label: {
                        Text(localization.t("byoc.onboarding.applyCleanup"))
                            .fontWeight(.semibold)
                    }
                    .tvCardStyle()
                }
            }
        }

        // MARK: - Step 3: Personalization

        private var personalizationStep: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Text(localization.t("byoc.onboarding.personalizeTitle"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("byoc.onboarding.personalizeDesc"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)

                if let plan {
                    ScrollView(.horizontal) {
                        HStack(spacing: TVDesignTokens.Spacing.md) {
                            ForEach(plan.suggestedCategories, id: \.self) { cat in
                                Button {
                                    if enabledCategories.contains(cat) {
                                        enabledCategories.remove(cat)
                                    } else {
                                        enabledCategories.insert(cat)
                                    }
                                } label: {
                                    Text(cat.capitalized)
                                        .font(.system(size: TVDesignTokens.FontSize.md))
                                        .padding(.horizontal, TVDesignTokens.Spacing.lg)
                                        .padding(.vertical, TVDesignTokens.Spacing.md)
                                        .background(enabledCategories.contains(cat)
                                            ? DesignTokens.Primary.p400
                                            : DesignTokens.Background.elevated)
                                        .foregroundStyle(enabledCategories.contains(cat)
                                            ? .white
                                            : DesignTokens.Text.primary)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                    }
                }

                Spacer()

                Button {
                    onDismiss()
                } label: {
                    Text(localization.t("byoc.onboarding.ready"))
                        .fontWeight(.semibold)
                }
                .tvCardStyle()
            }
            .onAppear {
                if let plan {
                    enabledCategories = Set(plan.suggestedCategories.prefix(5))
                }
            }
        }

        // MARK: - Helpers

        private func statCard(
            icon: String, color: Color, value: String, label: String
        ) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 40))
                    .foregroundStyle(color)
                Text(value)
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(label)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(width: 200)
            .padding()
            .background(DesignTokens.Background.elevated)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }

        private func tvDuplicateCard(_ group: DuplicateGroup) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(group.canonicalName)
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)
                Text("\(group.alternateIndices.count + 1) feeds")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                if let res = group.primaryResolution {
                    Text(res)
                        .font(.system(size: TVDesignTokens.FontSize.xs, weight: .medium))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(DesignTokens.Primary.p400.opacity(0.2))
                        .foregroundStyle(DesignTokens.Primary.p400)
                        .clipShape(Capsule())
                }
            }
            .frame(width: 220)
            .padding()
            .background(DesignTokens.Background.elevated)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }

        private func advanceStep() {
            withAnimation { currentStep = min(currentStep + 1, totalSteps - 1) }
        }

        private func startAnalysis() async {
            isAnalyzing = true
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
                    progress, _ in
                    Task { @MainActor in analysisProgress = progress }
                }
                isAnalyzing = false
                advanceStep()
            } catch {
                isAnalyzing = false
            }
        }
    }

#endif
