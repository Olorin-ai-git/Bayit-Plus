import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main Widgets tab view with page header, system gallery, and personal widgets
struct WidgetsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: WidgetsViewModel?
    @State private var showCreateWidget = false

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
        .sheet(isPresented: $showCreateWidget) {
            if let vm = viewModel {
                CreateWidgetView(viewModel: vm) {
                    showCreateWidget = false
                }
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
            }
        }
    }

    // MARK: - Personal Widgets Section

    @ViewBuilder
    private func personalWidgetsSection(_ vm: WidgetsViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                Text(localization.t("widgets.personalWidgets"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)

                Spacer()

                GlassButton("Create", variant: .primary, size: .small,
                             icon: Image(systemName: "plus")) {
                    showCreateWidget = true
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            if vm.personalWidgets.isEmpty && !vm.isLoadingMyWidgets {
                personalWidgetsEmptyState
            } else if vm.isLoadingMyWidgets && vm.personalWidgets.isEmpty {
                personalWidgetsLoading
            } else if let error = vm.myWidgetsError, vm.personalWidgets.isEmpty {
                ErrorStateView(message: error) {
                    Task { await vm.refresh() }
                }
            } else {
                personalWidgetsList(vm)
            }
        }
    }

    private func personalWidgetsList(_ vm: WidgetsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ForEach(vm.personalWidgets) { widget in
                personalWidgetCard(widget, vm: vm)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func personalWidgetCard(_ widget: WidgetItem, vm: WidgetsViewModel) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: widget.content?.contentType?.iconName ?? "square.grid.2x2")
                .font(.system(size: 24))
                .foregroundStyle(DesignTokens.Primary.p300)
                .frame(width: 44, height: 44)
                .background(DesignTokens.Glass.purpleLight)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                Text(widget.title)
                    .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                if let contentType = widget.content?.contentType {
                    Text(contentType.displayLabel)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }

            Spacer()

            Button {
                Task { await vm.deletePersonalWidget(widgetId: widget.id) }
            } label: {
                Image(systemName: "trash")
                    .font(.system(size: 16))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                    .frame(width: 36, height: 36)
            }
            .accessibilityLabel("Delete \(widget.title)")
        }
        .padding(DesignTokens.Spacing.md)
        .glassCard()
    }

    private var personalWidgetsEmptyState: some View {
        Button { showCreateWidget = true } label: {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "plus.square.dashed")
                    .font(.system(size: 32))
                    .foregroundColor(DesignTokens.Primary.p400)

                Text("Create your first personal widget")
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundColor(DesignTokens.Text.muted)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignTokens.Spacing.xl)
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .glassCard()
        }
        .buttonStyle(.plain)
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .accessibilityLabel("Create personal widget")
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
