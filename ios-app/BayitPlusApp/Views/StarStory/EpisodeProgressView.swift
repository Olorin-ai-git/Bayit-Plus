import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Displays real-time generation progress with stage timeline and progress bar.
struct EpisodeProgressView: View {
    @Environment(LocalizationManager.self) private var localization
    let viewModel: StarStoryViewModel

    private var currentStageIndex: Int {
        guard let stage = viewModel.generationProgress?.currentStage else { return -1 }
        return GenerationStage.allCases.firstIndex(where: { $0.rawValue == stage }) ?? -1
    }

    private var progressPercent: Double {
        viewModel.generationProgress?.progressPercent ?? 0
    }

    private var isFailed: Bool {
        viewModel.generationProgress?.status == "failed"
    }

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: isFailed ? "exclamationmark.triangle" : "sparkles")
                .font(.system(size: DesignTokens.FontSize.xxxl))
                .foregroundStyle(
                    isFailed
                        ? DesignTokens.ErrorColor.default
                        : DesignTokens.Primary.p400
                )

            Text(
                isFailed
                    ? localization.t("starStory.generationFailed")
                    : localization.t("starStory.generatingEpisode")
            )
            .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)

            stageTimeline

            progressBar

            if isFailed, let errorMsg = viewModel.generationProgress?.errorMessage {
                GlassCard {
                    HStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: "xmark.circle")
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                        Text(errorMsg)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }

            if !isFailed {
                Text(localization.t("starStory.generationEstimate"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            GlassButton(
                localization.t("common.cancel"),
                variant: .secondary,
                size: .medium
            ) {
                viewModel.cancelPolling()
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.xxl)
    }

    private var stageTimeline: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(GenerationStage.allCases.enumerated()), id: \.element) { index, stage in
                HStack(spacing: DesignTokens.Spacing.md) {
                    stageIndicator(index: index, stage: stage)

                    Text(stage.displayName)
                        .font(.system(
                            size: DesignTokens.FontSize.sm,
                            weight: index == currentStageIndex ? .semibold : .regular
                        ))
                        .foregroundStyle(
                            index < currentStageIndex
                                ? DesignTokens.Text.secondary
                                : index == currentStageIndex
                                    ? DesignTokens.Text.primary
                                    : DesignTokens.Text.muted
                        )
                }
                .padding(.vertical, DesignTokens.Spacing.sm)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func stageIndicator(index: Int, stage: GenerationStage) -> some View {
        ZStack {
            Circle()
                .fill(
                    index < currentStageIndex
                        ? DesignTokens.Success.default
                        : index == currentStageIndex
                            ? DesignTokens.Primary.p400
                            : DesignTokens.Glass.bg
                )
                .frame(width: 32, height: 32)

            if index < currentStageIndex {
                Image(systemName: "checkmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.white)
            } else {
                Image(systemName: stage.systemImage)
                    .font(.system(size: 14))
                    .foregroundStyle(
                        index == currentStageIndex ? .white : DesignTokens.Text.muted
                    )
            }
        }
    }

    private var progressBar: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        .fill(DesignTokens.Glass.bg)

                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        .fill(DesignTokens.Primary.p400)
                        .frame(width: geo.size.width * (progressPercent / 100))
                        .animation(.easeInOut(duration: 0.5), value: progressPercent)
                }
            }
            .frame(height: 8)

            Text("\(Int(progressPercent))%")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
