import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

// MARK: - TVPodcastsView + Content Sections

extension TVPodcastsView {
    func podcastsGrid(_ vm: PodcastsViewModel) -> some View {
        let columns = [
            GridItem(.adaptive(
                minimum: TVDesignTokens.MinSize.posterWidth,
                maximum: TVDesignTokens.MinSize.posterWidth + 60
            ), spacing: TVDesignTokens.Spacing.focusGap),
        ]

        return VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack {
                Text(vm.selectedCategory != nil ? localization.t("podcasts.title") : localization.t("podcasts.allPodcasts"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Button {
                    showAddSheet = true
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "plus.circle")
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                        Text(localization.t("podcasts.addPodcast"))
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    }
                    .foregroundStyle(DesignTokens.Primary.default)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bg)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                }
                .buttonStyle(.card)
                .tvFocusStyle()

                Button {
                    Task { await vm.refresh() }
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                            .rotationEffect(.degrees(vm.isSyncing ? 360 : 0))
                            .animation(
                                vm.isSyncing
                                    ? .linear(duration: 1).repeatForever(autoreverses: false)
                                    : .default,
                                value: vm.isSyncing
                            )
                        Text(localization.t("common.refresh"))
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    }
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bg)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                }
                .buttonStyle(.card)
                .tvFocusStyle()
                .disabled(vm.isSyncing)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(vm.shows) { show in
                    GlassFocusPoster(
                        thumbnailURL: show.cover,
                        title: show.title ?? "Podcast",
                        subtitle: show.author,
                        metadata: show.latestEpisode,
                        aspectRatio: 1.0,
                        onSelect: {
                            audioManager.play(
                                contentId: show.id,
                                contentType: .podcast
                            )
                        }
                    )
                    .tvFocusStyle()
                    .contextMenu {
                        Button {
                            coordinator.fullscreenRoute = .podcastDetail(showId: show.id)
                        } label: {
                            Label(localization.t("podcasts.episodes"), systemImage: "list.bullet")
                        }
                        if show.isUserAdded == true {
                            Button(role: .destructive) {
                                Task { await vm.removePodcast(id: show.id) }
                            } label: {
                                Label(localization.t("podcasts.removePodcast"), systemImage: "trash")
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
        }
    }

    func categoryFilters(_ vm: PodcastsViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                categoryChip(localization.t("common.all"), isSelected: vm.selectedCategory == nil) {
                    Task { await vm.filterByCategory(nil) }
                }

                ForEach(vm.categories) { cat in
                    categoryChip(cat.name, isSelected: vm.selectedCategory == cat.id) {
                        Task { await vm.filterByCategory(cat.id) }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
        .frame(height: TVDesignTokens.MinSize.focusableHeight + 20)
    }

    func categoryChip(
        _ title: String,
        isSelected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(isSelected ? DesignTokens.Text.primary : DesignTokens.Text.secondary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(isSelected ? DesignTokens.Glass.bgStrong : DesignTokens.Glass.bg)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }
}
