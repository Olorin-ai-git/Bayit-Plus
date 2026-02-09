import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main Widgets tab view with page header, system gallery, and personal widgets
struct WidgetsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: WidgetsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                    WidgetsPageHeaderView(
                        widgetCount: vm.totalWidgetCount,
                        isDockVisible: vm.isDockVisible,
                        onToggleDock: { vm.isDockVisible.toggle() }
                    )

                    SystemWidgetGalleryView(viewModel: vm)

                    personalWidgetsSection(vm)
                }
                .padding(.bottom, DesignTokens.Spacing.xxxl)
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if viewModel == nil {
                viewModel = WidgetsViewModel(repository: repos.widget)
            }
            await viewModel?.loadAll()
        }
    }

    // MARK: - Personal Widgets Section

    @ViewBuilder
    private func personalWidgetsSection(_ vm: WidgetsViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("widgets.personalWidgets"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            if vm.myWidgets.isEmpty && !vm.isLoadingMyWidgets {
                personalWidgetsEmptyState
            } else if vm.isLoadingMyWidgets && vm.myWidgets.isEmpty {
                personalWidgetsLoading
            } else if let error = vm.myWidgetsError, vm.myWidgets.isEmpty {
                ErrorStateView(message: error) {
                    Task { await vm.refresh() }
                }
            }
        }
    }

    private var personalWidgetsEmptyState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "plus.square.dashed")
                .font(.system(size: 32))
                .foregroundColor(DesignTokens.Text.disabled)

            Text(localization.t("widgets.emptyPersonal"))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundColor(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.xl)
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .glassCard()
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var personalWidgetsLoading: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 60)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
