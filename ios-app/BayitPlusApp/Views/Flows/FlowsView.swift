import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Flows screen showing content sequences that users can follow
struct FlowsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: FlowsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.flows.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.flows.isEmpty {
                    ErrorStateView(message: error) {
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
        .refreshable {
            await viewModel?.load()
        }
        .task {
            if viewModel == nil {
                viewModel = FlowsViewModel(repository: repos.category)
            }
            await viewModel?.load()
        }
    }

    private func flowsList(_ vm: FlowsViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            ForEach(vm.flows) { flow in
                flowCard(flow)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private func flowCard(_ flow: FlowItem) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                if let thumb = flow.thumbnail {
                    GlassContentCard(
                        thumbnailURL: thumb,
                        title: flow.name,
                        subtitle: flowSubtitle(flow),
                        aspectRatio: 21/9,
                        width: .infinity,
                        onTap: {}
                    )
                }

                if let desc = flow.description {
                    Text(desc)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .lineLimit(3)
                        .padding(.horizontal, DesignTokens.Spacing.md)
                }

                if let items = flow.items, !items.isEmpty {
                    flowItemsList(items)
                }
            }
            .padding(.bottom, DesignTokens.Spacing.md)
        }
    }

    private func flowSubtitle(_ flow: FlowItem) -> String {
        var parts: [String] = []
        if let count = flow.totalItems {
            parts.append("\(count) items")
        }
        if let duration = flow.duration {
            parts.append(duration)
        }
        return parts.joined(separator: " - ")
    }

    private func flowItemsList(_ items: [FlowContentItem]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(items) { item in
                    flowItemCard(item)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
        }
    }

    private func flowItemCard(_ item: FlowContentItem) -> some View {
        GlassContentCard(
            thumbnailURL: item.thumbnail,
            title: item.title,
            subtitle: item.duration,
            badge: item.position.map { "#\($0)" },
            width: 160,
            onTap: {
                if let contentId = item.contentId {
                    coordinator.pushToCurrentTab(.movieDetail(movieId: contentId))
                }
            }
        )
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "line.3.horizontal.decrease.circle")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Text.muted)

            Text(localization.t("flows.empty"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 120)
    }

    private var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 200)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}
