import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Flows screen showing content sequences with thumbnail and item lists.
/// Reuses FlowsViewModel from shared ViewModels.
struct TVFlowsView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: FlowsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.flows.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.flows.isEmpty {
                    tvErrorState(error) {
                        Task { await viewModel?.load() }
                    }
                } else if vm.flows.isEmpty {
                    emptyState
                } else {
                    flowsList(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = FlowsViewModel(repository: repos.category)
            }
            await viewModel?.load()
        }
    }

    private func flowsList(_ vm: FlowsViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            ForEach(vm.flows) { flow in
                flowSection(flow)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private func flowSection(_ flow: FlowItem) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            flowHeader(flow)

            if let items = flow.items, !items.isEmpty {
                flowItemsShelf(items)
            }
        }
    }

    private func flowHeader(_ flow: FlowItem) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            Text(flow.name ?? "Flow")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            HStack(spacing: TVDesignTokens.Spacing.md) {
                if let count = flow.totalItems {
                    Text("\(count) \(localization.t("tvos.flows.items"))")
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                if let duration = flow.duration {
                    Text(duration)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }

            if let desc = flow.description {
                Text(desc)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .lineLimit(2)
            }
        }
    }

    private func flowItemsShelf(_ items: [FlowContentItem]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: TVDesignTokens.Spacing.lg) {
                ForEach(items) { item in
                    flowItemCard(item)
                }
            }
        }
    }

    private func flowItemCard(_ item: FlowContentItem) -> some View {
        GlassFocusPoster(
            thumbnailURL: item.thumbnail,
            title: item.title ?? "Item",
            subtitle: item.duration,
            badge: item.position.map { "#\($0)" },
            aspectRatio: 16 / 9
        )
        .frame(width: TVDesignTokens.MinSize.posterWidth)
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "line.3.horizontal.decrease.circle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("tvos.flows.empty"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("tvos.flows.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
