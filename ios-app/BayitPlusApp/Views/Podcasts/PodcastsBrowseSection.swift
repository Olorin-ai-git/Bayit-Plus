import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Browse section containing category filters, show grid, and audiobooks
/// for the Podcasts/Listen screen.
extension PodcastsView {
    func categoryFilters(_ vm: PodcastsViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                GlassChip(
                    title: "All",
                    isSelected: vm.selectedCategory == nil
                ) {
                    Task { await vm.filterByCategory(nil) }
                }

                ForEach(vm.categories) { cat in
                    GlassChip(
                        title: cat.name,
                        isSelected: vm.selectedCategory == cat.id
                    ) {
                        Task { await vm.filterByCategory(cat.id) }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    func showGrid(_ vm: PodcastsViewModel) -> some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(vm.shows) { show in
                PodcastShowCard(
                    show: show,
                    onTap: {
                        coordinator.navigate(to: .podcastDetail(showId: show.id))
                    },
                    onDelete: show.isUserAdded == true ? {
                        await vm.removePodcast(id: show.id)
                    } : nil
                )
                .onAppear {
                    if show.id == vm.shows.last?.id {
                        Task { await vm.loadMore() }
                    }
                }
            }

            if vm.isLoadingMore {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func audiobooksSection(_ audiobookVM: AudiobooksViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            HStack {
                Text(localization.t("audiobooks.title"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                Spacer()
                Button {
                    coordinator.navigate(to: .audiobooks)
                } label: {
                    Text(localization.t("common.seeAll"))
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                        .foregroundColor(DesignTokens.Primary.default)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(Array(audiobookVM.items.prefix(10))) { audiobook in
                        AudiobookCardView(audiobook: audiobook) {
                            coordinator.navigate(to: .audiobookDetail(audiobookId: audiobook.id))
                        }
                        .frame(width: 150)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }
}
