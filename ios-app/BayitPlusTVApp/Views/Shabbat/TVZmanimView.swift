import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Zmanim view showing Shabbat status, daily times, settings, and content.
///
/// Port of the iOS `ZmanimView` following the TVJudaismView pattern.
/// Toggle and manual toggle button are placed in separate `.focusSection()`
/// containers to prevent focus traps in the ScrollView.
struct TVZmanimView: View {
    @Environment(TVRepositoryProvider.self) var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: ShabbatViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.zmanimData == nil {
                    loadingState
                } else if let error = vm.error, vm.zmanimData == nil {
                    tvErrorState(error) {
                        Task { await vm.loadZmanim() }
                    }
                } else {
                    content(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = ShabbatViewModel(repository: repos.shabbat)
            }
            await viewModel?.loadZmanim()
            await viewModel?.loadShabbatContent()
        }
    }

    // MARK: - Content

    private func content(_ vm: ShabbatViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            TVPageHeader(
                icon: "flame.fill",
                title: localization.t("judaism.shabbat.title")
            )
            statusSection(vm)
            zmanimTimesSection(vm)
            settingsSection(vm)
            if !vm.shabbatContent.isEmpty {
                contentSection(vm)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }


    func zmanimRow(
        icon: String,
        label: String,
        time: String,
        color: Color
    ) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(color)
                .frame(width: 36)

            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Text(time)
                .font(.system(
                    size: TVDesignTokens.FontSize.lg,
                    weight: .semibold,
                    design: .monospaced
                ))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.vertical, TVDesignTokens.Spacing.md)
    }
}
