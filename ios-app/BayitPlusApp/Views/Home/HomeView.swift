import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Home screen with hero, spotlight carousel, and category rows
struct HomeView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: HomeViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.xl) {
                    if vm.isLoading && vm.categories.isEmpty {
                        loadingState
                    } else if let error = vm.error, vm.categories.isEmpty {
                        errorState(error)
                    } else {
                        contentSections(vm)
                    }
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
        .task {
            if viewModel == nil {
                viewModel = HomeViewModel(repository: repos.content)
            }
            await viewModel?.loadFeatured()
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: HomeViewModel) -> some View {
        if let hero = vm.hero {
            HeroSection(hero: hero)
        }

        if !vm.spotlight.isEmpty {
            SpotlightSection(items: vm.spotlight, coordinator: coordinator)
        }

        ForEach(vm.categories) { category in
            CategoryRow(category: category, coordinator: coordinator)
        }
    }

    private var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 180)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .padding(.top, DesignTokens.Spacing.xl)
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.xl)

            GlassButton("Retry", variant: .secondary, size: .medium) {
                Task { await viewModel?.refresh() }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 100)
    }
}
