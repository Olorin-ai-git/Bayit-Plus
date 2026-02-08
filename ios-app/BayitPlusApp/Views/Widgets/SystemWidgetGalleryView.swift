import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Grid gallery of available system widgets with loading/error/empty states
struct SystemWidgetGalleryView: View {
    @Environment(LocalizationManager.self) private var localization
    let viewModel: WidgetsViewModel

    private let columns = [
        GridItem(.flexible())
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            sectionHeader
            galleryContent
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Header

    private var sectionHeader: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
            Text(localization.t("widgets.systemWidgets"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundColor(DesignTokens.Text.primary)

            Text(localization.t("widgets.systemWidgetsHint"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }

    // MARK: - Content States

    @ViewBuilder
    private var galleryContent: some View {
        if viewModel.isLoadingGallery && viewModel.availableWidgets.isEmpty {
            loadingSkeleton
        } else if let error = viewModel.galleryError, viewModel.availableWidgets.isEmpty {
            ErrorStateView(message: error) {
                Task { await viewModel.loadAll() }
            }
        } else if viewModel.availableWidgets.isEmpty {
            emptyState
        } else {
            widgetGrid
        }
    }

    private var widgetGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(viewModel.availableWidgets) { widget in
                SystemWidgetCardView(
                    widget: widget,
                    isDockVisible: viewModel.isDockVisible,
                    isActionLoading: viewModel.actionLoadingIds.contains(widget.id),
                    onAdd: { Task { await viewModel.addSystemWidget(widgetId: widget.id) } },
                    onRemove: { Task { await viewModel.removeSystemWidget(widgetId: widget.id) } }
                )
            }
        }
    }

    private var loadingSkeleton: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(0..<6, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 72)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "square.grid.2x2")
                .font(.system(size: 36))
                .foregroundColor(DesignTokens.Text.disabled)

            Text(localization.t("widgets.noSystemWidgets"))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundColor(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.xxxl)
        .glassCard()
    }
}
