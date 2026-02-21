import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Morning Ritual screen with greeting, streak, AI brief, and daily content.
///
/// Port of the iOS `MorningRitualView` following the TVJudaismView pattern.
/// Accessible from Settings -> Preferences rather than as a dedicated tab.
struct TVMorningRitualView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: MorningRitualViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.ritualContent.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.ritualContent.isEmpty {
                    tvErrorState(error) {
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

    // MARK: - Content Sections

    private func contentSections(_ vm: MorningRitualViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            TVPageHeader(
                icon: "sunrise",
                title: localization.t("ritual.title")
            )
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
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    // MARK: - Greeting

    private func greetingHeader(_ vm: MorningRitualViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            if let greeting = vm.greeting {
                Text(greeting)
                    .font(.system(
                        size: TVDesignTokens.FontSize.xxxl,
                        weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)
            } else {
                Text(localization.t("ritual.goodMorning"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.xxxl,
                        weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            Text(localization.t("ritual.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, TVDesignTokens.Spacing.xl)
    }

    // MARK: - Streak

    private func streakCard(_ vm: MorningRitualViewModel) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                Text(localization.t("ritual.streak"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Text("\(vm.ritualCheck?.streakDays ?? 0)")
                    .font(.system(
                        size: TVDesignTokens.FontSize.xxxl,
                        weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Primary.default)

                Text(localization.t("ritual.days"))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(TVDesignTokens.Spacing.xl)

            Spacer()

            if vm.ritualCheck?.completedToday == true {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Success.default)
                    .padding(.trailing, TVDesignTokens.Spacing.xl)
            } else {
                Image(systemName: "sun.max.fill")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Primary.default)
                    .padding(.trailing, TVDesignTokens.Spacing.xl)
            }
        }
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    // MARK: - Loading

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("ritual.title"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
