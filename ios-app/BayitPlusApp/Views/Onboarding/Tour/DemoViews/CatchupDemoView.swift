import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Catchup demo: interactive timeline with program thumbnails.
/// Tap a program to see a pre-generated AI summary card.
struct CatchupDemoView: View {
    @Environment(LocalizationManager.self) var localization
    @State private var selectedProgram: Int?

    private struct SampleProgram: Identifiable {
        let id: Int
        let titleKey: String
        let timeKey: String
        let summaryKey: String
    }

    private var programs: [SampleProgram] {
        [
            SampleProgram(id: 0, titleKey: "onboarding.tour.catchup.prog1Title",
                          timeKey: "onboarding.tour.catchup.prog1Time",
                          summaryKey: "onboarding.tour.catchup.prog1Summary"),
            SampleProgram(id: 1, titleKey: "onboarding.tour.catchup.prog2Title",
                          timeKey: "onboarding.tour.catchup.prog2Time",
                          summaryKey: "onboarding.tour.catchup.prog2Summary"),
            SampleProgram(id: 2, titleKey: "onboarding.tour.catchup.prog3Title",
                          timeKey: "onboarding.tour.catchup.prog3Time",
                          summaryKey: "onboarding.tour.catchup.prog3Summary"),
        ]
    }

    var body: some View {
        VStack(spacing: 0) {
            headerSection
            timelineSection
            if let idx = selectedProgram {
                summaryCard(for: programs[idx])
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .background(DesignTokens.Background.primary)
    }

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("onboarding.tour.catchup.title"))
                .font(DesignTokens.Typography.title2)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            Text(localization.t("onboarding.tour.catchup.tagline"))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, DesignTokens.Spacing.xl)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var timelineSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.md) {
                ForEach(programs) { program in
                    programTile(program)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
        }
        .padding(.vertical, DesignTokens.Spacing.lg)
    }

    private func programTile(_ program: SampleProgram) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                .fill(
                    selectedProgram == program.id
                        ? DesignTokens.Colors.accentPrimary.opacity(0.3)
                        : DesignTokens.Glass.bg
                )
                .frame(width: 140, height: 80)
                .overlay(
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                )

            Text(localization.t(program.titleKey))
                .font(DesignTokens.Typography.caption)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .lineLimit(1)

            Text(localization.t(program.timeKey))
                .font(DesignTokens.Typography.caption2)
                .foregroundStyle(DesignTokens.Colors.textTertiary)
        }
        .frame(width: 140)
        .onTapGesture {
            withAnimation(.spring(response: 0.4)) {
                selectedProgram = program.id
            }
        }
    }

    private func summaryCard(for program: SampleProgram) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(DesignTokens.Colors.accentPrimary)
                Text(localization.t("onboarding.tour.catchup.aiSummary"))
                    .font(DesignTokens.Typography.headline)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
            }

            Text(localization.t(program.summaryKey))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.bottom, DesignTokens.Spacing.xl)
    }
}
