import BayitDesignSystem
import SwiftUI

/// Full-screen trending content view with topics, headlines, and AI recommendations.
/// Reuses the existing TrendingViewModel and TrendingRowView components.
struct TrendingView: View {
    @Environment(RepositoryProvider.self) private var repos
    @State private var viewModel: TrendingViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.topics.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.topics.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await vm.refresh() }
                    }
                } else if vm.topics.isEmpty && vm.headlines.isEmpty && vm.recommendations.isEmpty {
                    emptyState
                } else {
                    TrendingRowView()
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if viewModel == nil {
                viewModel = TrendingViewModel(repository: repos.trendingRepo)
            }
            await viewModel?.loadAll()
        }
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Text.muted)

            Text("No trending content available")
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 120)
        .accessibilityElement(children: .combine)
    }

    private var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 100)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .padding(.top, DesignTokens.Spacing.lg)
        .accessibilityHidden(true)
    }
}
