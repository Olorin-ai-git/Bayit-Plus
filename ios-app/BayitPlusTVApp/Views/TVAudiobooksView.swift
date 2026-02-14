import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

/// tvOS Audiobooks screen with a poster grid layout matching TVVODView.
/// Reuses AudiobooksViewModel from shared ViewModels.
struct TVAudiobooksView: View {
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
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoading && vm.items.isEmpty {
                        loadingGrid
                    } else if let error = vm.error, vm.items.isEmpty {
                        tvErrorState(error) {
                            Task { await vm.refresh() }
                        }
                    } else if vm.items.isEmpty {
                        emptyState
                    } else {
                        contentGrid(vm.items, isLoadingMore: vm.isLoadingMore)
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
    }

    // MARK: - Content Grid

    private func contentGrid(
        _ items: [Audiobook],
        isLoadingMore: Bool
    ) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("audiobooks.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(items) { audiobook in
                    GlassFocusPoster(
                        thumbnailURL: audiobook.thumbnail,
                        title: audiobook.title ?? "Audiobook",
                        subtitle: audiobook.author,
                        badge: audiobook.duration,
                        aspectRatio: 2 / 3,
                        onSelect: {
                            coordinator.presentPlayer(
                                contentId: audiobook.id,
                                contentType: .audiobook
                            )
                        }
                    )
                    .onAppear {
                        if audiobook.id == items.last?.id {
                            Task { await viewModel?.loadMore() }
                        }
                    }
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)

            if isLoadingMore {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .scaleEffect(1.2)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, TVDesignTokens.Spacing.xl)
            }
        }
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    // MARK: - Loading Grid

    private var loadingGrid: some View {
        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(0..<10, id: \.self) { _ in
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster)
                    .fill(DesignTokens.Glass.bg)
                    .aspectRatio(2 / 3, contentMode: .fit)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.top, TVDesignTokens.Spacing.lg)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "book.closed")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("audiobooks.noAudiobooks"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }
}
