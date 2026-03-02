import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Judaism content screen with calendar events, category shelves, and news.
/// Reuses JudaismViewModel from shared ViewModels.
struct TVJudaismView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: JudaismViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.categories.isEmpty {
                    loadingState
                } else if let error = vm.error, vm.categories.isEmpty {
                    tvErrorState(error) {
                        Task { await viewModel?.load() }
                    }
                } else {
                    contentSections(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = JudaismViewModel(repository: repos.category)
            }
            await viewModel?.load()
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: JudaismViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            if !vm.calendarEvents.isEmpty {
                calendarShelf(vm)
            }

            if !vm.categories.isEmpty {
                categoryShelf(vm)
            }

            if !vm.items.isEmpty {
                contentShelf(vm)
            }

            if !vm.news.isEmpty {
                newsShelf(vm)
            }
        }
    }

    private func calendarShelf(_ vm: JudaismViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("judaism.calendar"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: TVDesignTokens.Spacing.lg) {
                    ForEach(vm.calendarEvents) { event in
                        calendarEventCard(event)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
        }
    }

    private func calendarEventCard(_ event: CalendarEvent) -> some View {
        Button {} label: {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                Text(event.name ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                if let date = event.date {
                    Text(date)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Primary.default)
                }

                if let desc = event.description {
                    Text(desc)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(2)
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(width: 360, alignment: .leading)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .tvCardStyle()
    }

    private func categoryShelf(_ vm: JudaismViewModel) -> some View {
        GlassContentShelf(title: "Categories", items: vm.categories) { cat in
            GlassFocusPoster(
                thumbnailURL: cat.thumbnail,
                title: cat.name ?? "Category",
                aspectRatio: 16 / 9
            )
        }
    }

    private func contentShelf(_ vm: JudaismViewModel) -> some View {
        GlassContentShelf(title: "Jewish Content", items: vm.items) { item in
            GlassFocusPoster(
                thumbnailURL: item.thumbnail,
                title: item.title ?? "Content",
                subtitle: item.duration,
                aspectRatio: 16 / 9
            )
        }
    }

    private func newsShelf(_ vm: JudaismViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("judaism.news"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            LazyVStack(spacing: TVDesignTokens.Spacing.sm) {
                ForEach(vm.news.prefix(5)) { item in
                    newsCard(item)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    private func newsCard(_ item: NewsItem) -> some View {
        Button {} label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(item.title ?? "")
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let source = item.source {
                        Text(source)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                Spacer()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .tvCardStyle()
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("tvos.judaism.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
