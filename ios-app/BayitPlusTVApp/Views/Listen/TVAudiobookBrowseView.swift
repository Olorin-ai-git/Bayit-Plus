#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Full grid browse view for audiobooks with sort and filter options.
    /// Presented as a fullscreen modal from the Listen tab.
    struct TVAudiobookBrowseView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(LocalizationManager.self) private var localization
        @State private var viewModel: AudiobooksViewModel?

        private let columns = [
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        ]

        var body: some View {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoading && vm.items.isEmpty {
                        loadingGrid
                    } else if let error = vm.error, vm.items.isEmpty {
                        tvErrorState(error) {
                            Task { await vm.refresh() }
                        }
                    } else if vm.filteredItems.isEmpty {
                        emptyState
                    } else {
                        browseContent(vm)
                    }
                }
            }
            .background(DesignTokens.Background.primary)
            .task {
                if viewModel == nil {
                    viewModel = AudiobooksViewModel(repository: repos.audiobook)
                }
                await viewModel?.loadInitial()
            }
        }

        private func browseContent(_ vm: AudiobooksViewModel) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                headerRow(vm)
                sortFilterRow(vm)
                audiobookGrid(vm)

                if vm.isLoadingMore {
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                        .scaleEffect(1.2)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, TVDesignTokens.Spacing.xl)
                }
            }
            .padding(.top, TVDesignTokens.Spacing.lg)
        }

        private func headerRow(_ vm: AudiobooksViewModel) -> some View {
            HStack {
                Text(localization.t("listen.browseAudiobooks"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Button {
                    Task { await vm.refresh() }
                } label: {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: TVDesignTokens.FontSize.base))
                        Text(localization.t("common.retry"))
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    }
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bg)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                }
                .tvCardStyle()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }

        private func sortFilterRow(_ vm: AudiobooksViewModel) -> some View {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(AudiobookSortOption.titleOptions, id: \.self) { option in
                        sortChip(option, vm: vm)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
            .frame(height: TVDesignTokens.MinSize.focusableHeight + 20)
        }

        private func sortChip(_ option: AudiobookSortOption, vm: AudiobooksViewModel) -> some View {
            Button {
                vm.sortOption = option
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: option.iconName)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                    Text(option.label)
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                }
                .foregroundStyle(
                    vm.sortOption == option ? DesignTokens.Text.primary : DesignTokens.Text.secondary
                )
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(
                    vm.sortOption == option ? DesignTokens.Glass.bgStrong : DesignTokens.Glass.bg
                )
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
            }
            .tvCardStyle()
        }

        private func audiobookGrid(_ vm: AudiobooksViewModel) -> some View {
            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(vm.filteredItems) { audiobook in
                    TVAudiobookCardView(audiobook: audiobook) {
                        coordinator.presentPlayer(
                            contentId: audiobook.id,
                            contentType: .audiobook
                        )
                    }
                    .contextMenu {
                        Button {
                            coordinator.fullscreenRoute = .audiobookDetail(audiobookId: audiobook.id)
                        } label: {
                            Label(localization.t("audiobooks.chapters"), systemImage: "list.bullet")
                        }
                    }
                    .onAppear {
                        if audiobook.id == vm.filteredItems.last?.id {
                            Task { await vm.loadMore() }
                        }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }

        private var loadingGrid: some View {
            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(0 ..< 10, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster)
                        .fill(DesignTokens.Glass.bg)
                        .aspectRatio(2 / 3, contentMode: .fit)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.top, TVDesignTokens.Spacing.lg)
        }

        private var emptyState: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Image(systemName: "book.closed")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(localization.t("audiobooks.noAudiobooks"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, TVDesignTokens.Spacing.xxxxl)
        }
    }
#endif
