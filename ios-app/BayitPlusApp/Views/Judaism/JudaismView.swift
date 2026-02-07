import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Judaism content screen with categories, calendar events, and news
struct JudaismView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: JudaismViewModel?

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.categories.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.categories.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await viewModel?.load() }
                    }
                } else {
                    contentSections(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.load()
        }
        .task {
            if viewModel == nil {
                viewModel = JudaismViewModel(repository: repos.category)
            }
            await viewModel?.load()
        }
    }

    private func contentSections(_ vm: JudaismViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            if !vm.calendarEvents.isEmpty {
                calendarSection(vm)
            }

            if !vm.categories.isEmpty {
                categoryChips(vm)
            }

            if !vm.items.isEmpty {
                contentGrid(vm)
            } else {
                categoryGrid(vm)
            }

            if !vm.news.isEmpty {
                newsSection(vm)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private func calendarSection(_ vm: JudaismViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("judaism.calendar"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(vm.calendarEvents) { event in
                        calendarEventCard(event)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    private func calendarEventCard(_ event: CalendarEvent) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(event.name ?? "")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)

                if let date = event.date {
                    Text(date)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Primary.default)
                }

                if let desc = event.description {
                    Text(desc)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .lineLimit(2)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .frame(width: 200)
        }
    }

    private func categoryChips(_ vm: JudaismViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(vm.categories) { cat in
                    GlassChip(
                        title: cat.name ?? "",
                        isSelected: vm.selectedCategory == cat.id
                    ) {
                        let newCat = vm.selectedCategory == cat.id ? nil : cat.id
                        Task { await vm.loadContent(category: newCat) }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private func categoryGrid(_ vm: JudaismViewModel) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(vm.categories) { cat in
                GlassContentCard(
                    thumbnailURL: cat.thumbnail,
                    title: cat.name,
                    width: .infinity
                ) {
                    Task { await vm.loadContent(category: cat.id) }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func contentGrid(_ vm: JudaismViewModel) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(vm.items) { item in
                GlassContentCard(
                    thumbnailURL: item.thumbnail,
                    title: item.title,
                    subtitle: item.duration,
                    width: .infinity
                ) {
                    coordinator.pushToCurrentTab(.movieDetail(movieId: item.id))
                }
            }

            if vm.items.count < vm.total {
                Color.clear
                    .frame(height: 1)
                    .onAppear { Task { await vm.loadMore() } }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func newsSection(_ vm: JudaismViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("judaism.news"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            LazyVStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(vm.news) { item in
                    GlassCard {
                        HStack(spacing: DesignTokens.Spacing.md) {
                            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                                Text(item.title ?? "")
                                    .font(.system(
                                        size: DesignTokens.FontSize.sm,
                                        weight: .medium
                                    ))
                                    .foregroundColor(DesignTokens.Text.primary)
                                    .lineLimit(2)

                                if let source = item.source {
                                    Text(source)
                                        .font(.system(size: DesignTokens.FontSize.xs))
                                        .foregroundColor(DesignTokens.Text.muted)
                                }
                            }
                            Spacer()
                        }
                        .padding(DesignTokens.Spacing.md)
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 120)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}
