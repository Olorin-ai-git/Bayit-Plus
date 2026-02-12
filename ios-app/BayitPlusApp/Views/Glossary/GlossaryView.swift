import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct GlossaryView: View {
    @State private var viewModel = GlossaryViewModel()

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                searchField
                categoryChips
                entriesList
            }
            .padding(.vertical, DesignTokens.Spacing.lg)
            .padding(.horizontal, DesignTokens.Spacing.md)
        }
        .background(DesignTokens.Background.primary)
        .navigationTitle("Hebrew Glossary")
        .task {
            await viewModel.fetchEntries(reset: true)
        }
    }

    private var searchField: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            TextField("Search phrases...", text: $viewModel.searchQuery)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .onSubmit { Task { await viewModel.search() } }
        }
        .padding(DesignTokens.Spacing.sm)
        .background(DesignTokens.Colors.surface)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.CornerRadius.lg))
    }

    private var categoryChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(GlossaryViewModel.categories, id: \.self) { category in
                    Button {
                        Task { await viewModel.selectCategory(category) }
                    } label: {
                        Text(category)
                            .font(.caption)
                            .fontWeight(viewModel.activeCategory == category ? .semibold : .regular)
                            .padding(.horizontal, DesignTokens.Spacing.md)
                            .padding(.vertical, DesignTokens.Spacing.xs)
                            .background(
                                viewModel.activeCategory == category
                                    ? DesignTokens.Colors.primaryAccent
                                    : DesignTokens.Colors.surface
                            )
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var entriesList: some View {
        LazyVStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(viewModel.entries) { entry in
                GlossaryDetailView(entry: entry)
            }

            if viewModel.hasMore && !viewModel.isLoading {
                Button("Load More") {
                    Task { await viewModel.loadMore() }
                }
                .foregroundStyle(DesignTokens.Colors.primaryAccent)
                .padding(.vertical, DesignTokens.Spacing.sm)
            }

            if viewModel.isLoading {
                ProgressView()
                    .tint(.white)
                    .padding(.vertical, DesignTokens.Spacing.lg)
            }

            if let error = viewModel.errorMessage {
                Text(error)
                    .foregroundStyle(DesignTokens.Colors.error)
                    .font(.caption)
            }
        }
    }
}
