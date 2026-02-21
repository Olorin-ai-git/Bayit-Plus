import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Morning Ritual screen with daily content, AI brief, and streak tracking
struct MorningRitualView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: MorningRitualViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.ritualContent.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.ritualContent.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await viewModel?.load() }
                    }
                } else {
                    contentSections(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = MorningRitualViewModel(repository: repos.category)
            }
            await viewModel?.load()
        }
    }

    private func contentSections(_ vm: MorningRitualViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            greetingHeader(vm)
            streakCard(vm)

            if let brief = vm.aiBrief {
                aiBriefSection(brief)
            } else {
                aiBriefLoadButton(vm)
            }

            if !vm.ritualContent.isEmpty {
                ritualItemsList(vm)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private func greetingHeader(_ vm: MorningRitualViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            if let greeting = vm.greeting {
                Text(greeting)
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)
            } else {
                Text(localization.t("ritual.goodMorning"))
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
            }

            Text(localization.t("ritual.subtitle"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, DesignTokens.Spacing.xl)
    }

    private func streakCard(_ vm: MorningRitualViewModel) -> some View {
        GlassCard {
            HStack {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(localization.t("ritual.streak"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)

                    Text("\(vm.ritualCheck?.streakDays ?? 0)")
                        .font(.system(size: 36, weight: .bold))
                        .foregroundColor(DesignTokens.Primary.default)

                    Text(localization.t("ritual.days"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)
                }
                .padding(DesignTokens.Spacing.lg)

                Spacer()

                if vm.ritualCheck?.completedToday == true {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 48))
                        .foregroundColor(DesignTokens.Success.default)
                        .padding(.trailing, DesignTokens.Spacing.lg)
                } else {
                    Image(systemName: "sun.max.fill")
                        .font(.system(size: 48))
                        .foregroundColor(DesignTokens.Primary.default)
                        .padding(.trailing, DesignTokens.Spacing.lg)
                }
            }
        }
    }

    private func aiBriefSection(_ brief: RitualAIBriefResponse) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                HStack {
                    Image(systemName: "sparkles")
                        .foregroundColor(DesignTokens.Primary.default)

                    Text(localization.t("ritual.aiBrief"))
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                }

                if let briefText = brief.brief {
                    Text(briefText)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                }

                if let topics = brief.topics, !topics.isEmpty {
                    FlowLayout(spacing: DesignTokens.Spacing.xs) {
                        ForEach(topics, id: \.self) { topic in
                            GlassChip(title: topic, isSelected: false) {}
                        }
                    }
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }

    private func aiBriefLoadButton(_ vm: MorningRitualViewModel) -> some View {
        GlassButton(
            localization.t("ritual.loadBrief"),
            variant: .secondary,
            size: .medium
        ) {
            Task { await vm.loadAIBrief() }
        }
        .frame(maxWidth: .infinity)
    }
}
