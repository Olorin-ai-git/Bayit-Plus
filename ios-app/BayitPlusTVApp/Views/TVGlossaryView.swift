import BayitDesignSystem
import SwiftUI

struct TVGlossaryView: View {
    @State private var viewModel = GlossaryViewModel()
    @FocusState private var focusedEntry: String?

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            headerSection
            categorySection
            gridSection
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(TVDesignTokens.Background.primary)
        .task {
            await viewModel.fetchEntries(reset: true)
        }
    }

    private var headerSection: some View {
        HStack {
            Image(systemName: "book.fill")
                .font(.title2)
                .foregroundStyle(TVDesignTokens.Colors.primaryAccent)
            Text("Hebrew Glossary")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(TVDesignTokens.Colors.textPrimary)
            Spacer()
        }
    }

    private var categorySection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(GlossaryViewModel.categories, id: \.self) { category in
                    Button {
                        Task { await viewModel.selectCategory(category) }
                    } label: {
                        Text(category)
                            .font(.callout)
                            .fontWeight(viewModel.activeCategory == category ? .bold : .regular)
                            .padding(.horizontal, TVDesignTokens.Spacing.lg)
                            .padding(.vertical, TVDesignTokens.Spacing.sm)
                    }
                    .buttonStyle(.card)
                }
            }
        }
    }

    private var gridSection: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
                    GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
                ],
                spacing: TVDesignTokens.Spacing.lg
            ) {
                ForEach(viewModel.entries) { entry in
                    tvGlossaryCard(entry: entry)
                        .focused($focusedEntry, equals: entry.id)
                }
            }

            if viewModel.hasMore && !viewModel.isLoading {
                Button("Load More") {
                    Task { await viewModel.loadMore() }
                }
                .padding(.top, TVDesignTokens.Spacing.lg)
            }

            if viewModel.isLoading {
                ProgressView()
                    .tint(.white)
                    .padding(.vertical, TVDesignTokens.Spacing.xl)
            }
        }
    }

    private func tvGlossaryCard(entry: GlossaryEntry) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            Text(entry.phrase)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(TVDesignTokens.Colors.textPrimary)
                .environment(\.layoutDirection, .rightToLeft)

            Text(entry.transliteration)
                .font(.caption)
                .foregroundStyle(TVDesignTokens.Colors.primaryAccent)
                .italic()

            Text(entry.translation)
                .font(.body)
                .foregroundStyle(TVDesignTokens.Colors.textSecondary)
                .lineLimit(2)

            if !entry.tags.isEmpty {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    ForEach(entry.tags.prefix(3), id: \.self) { tag in
                        Text(tag)
                            .font(.caption2)
                            .foregroundStyle(TVDesignTokens.Colors.primaryAccent)
                            .padding(.horizontal, TVDesignTokens.Spacing.sm)
                            .padding(.vertical, 2)
                            .background(TVDesignTokens.Colors.primaryAccent.opacity(0.15))
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(TVDesignTokens.Spacing.lg)
        .background(TVDesignTokens.Colors.surface.opacity(0.8))
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.CornerRadius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.CornerRadius.xl)
                .stroke(
                    focusedEntry == entry.id
                        ? TVDesignTokens.Colors.primaryAccent
                        : TVDesignTokens.Colors.border.opacity(0.25),
                    lineWidth: focusedEntry == entry.id ? 3 : 1
                )
        )
        .scaleEffect(focusedEntry == entry.id ? 1.05 : 1.0)
        .animation(.easeInOut(duration: 0.15), value: focusedEntry)
    }
}
