import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS catchup demo: horizontal timeline of programs navigable via
/// Siri Remote swipe, click to reveal an AI-generated summary card.
struct TVCatchupDemoView: View {
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
            SampleProgram(
                id: 0,
                titleKey: "onboarding.tour.catchup.prog1Title",
                timeKey: "onboarding.tour.catchup.prog1Time",
                summaryKey: "onboarding.tour.catchup.prog1Summary"
            ),
            SampleProgram(
                id: 1,
                titleKey: "onboarding.tour.catchup.prog2Title",
                timeKey: "onboarding.tour.catchup.prog2Time",
                summaryKey: "onboarding.tour.catchup.prog2Summary"
            ),
            SampleProgram(
                id: 2,
                titleKey: "onboarding.tour.catchup.prog3Title",
                timeKey: "onboarding.tour.catchup.prog3Time",
                summaryKey: "onboarding.tour.catchup.prog3Summary"
            ),
        ]
    }

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            headerSection
            timelineSection
            summarySection
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Text(localization.t("onboarding.tour.catchup.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("onboarding.tour.catchup.tagline"))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    // MARK: - Timeline

    private var timelineSection: some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(programs) { program in
                programTile(program)
            }
        }
    }

    private func programTile(_ program: SampleProgram) -> some View {
        Button {
            withAnimation(.spring(response: 0.4)) {
                selectedProgram = program.id
            }
        } label: {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .fill(
                        selectedProgram == program.id
                            ? DesignTokens.Colors.Primary.base.opacity(0.3)
                            : DesignTokens.Glass.bg
                    )
                    .frame(width: 300, height: 170)
                    .overlay(
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: TVDesignTokens.FontSize.xxxl))
                            .foregroundStyle(DesignTokens.Text.primary)
                    )

                Text(localization.t(program.titleKey))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                Text(localization.t(program.timeKey))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(width: 300)
        }
        .buttonStyle(.card)
    }

    // MARK: - Summary

    @ViewBuilder
    private var summarySection: some View {
        if let idx = selectedProgram, idx < programs.count {
            summaryCard(for: programs[idx])
                .transition(.move(edge: .bottom).combined(with: .opacity))
        } else {
            Spacer()
        }
    }

    private func summaryCard(for program: SampleProgram) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "sparkles")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Colors.Primary.base)
                Text(localization.t("onboarding.tour.catchup.aiSummary"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            Text(localization.t(program.summaryKey))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }
}
