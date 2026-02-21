#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVCollectionDetailView: View {
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(TVNavigationCoordinator.self) var coordinator
        @Environment(LocalizationManager.self) var localization
        @State private var viewModel: CollectionDetailViewModel?

        let collectionId: String
        let logger = BayitLogger(category: "TVCollectionDetail")

        var body: some View {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoading && vm.collection == nil {
                        loadingState
                    } else if let error = vm.error, vm.collection == nil {
                        tvErrorState(error) {
                            Task { await vm.loadCollection() }
                        }
                    } else if let collection = vm.collection {
                        collectionContent(collection)
                    }
                } else {
                    loadingState
                }
            }
            .background(DesignTokens.Background.primary)
            .ignoresSafeArea()
            .task {
                if viewModel == nil {
                    viewModel = CollectionDetailViewModel(
                        collectionId: collectionId,
                        repository: repos.content
                    )
                }
                await viewModel?.loadCollection()
            }
        }

        private func collectionContent(_ collection: CollectionDetail) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxl) {
                backdropSection(collection)
                actionButtons(collection)
                descriptionSection(collection)

                if let promoText = collection.localizedPromoText(for: lang) {
                    promoCard(promoText)
                }

                if let movies = collection.movies, !movies.isEmpty {
                    TVCollectionMovieListView(
                        movies: movies,
                        collectionId: collectionId
                    )
                }
            }
        }

        var lang: String {
            localization.currentLanguage.rawValue
        }

        private var loadingState: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .scaleEffect(2.0)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, TVDesignTokens.Spacing.xxxxl)
        }
    }

    // MARK: - Backdrop & Metadata

    extension TVCollectionDetailView {
        private func backdropSection(_ collection: CollectionDetail) -> some View {
            ZStack(alignment: .bottomLeading) {
                CachedAsyncImage(url: (collection.backdrop ?? collection.thumbnail).flatMap(URL.init)) { phase in
                    if case let .success(image) = phase {
                        image.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        DesignTokens.Glass.bg
                    }
                }

                LinearGradient(
                    colors: [.clear, DesignTokens.Background.primary],
                    startPoint: .center,
                    endPoint: .bottom
                )

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    Text(collection.localizedTitle(for: lang) ?? localization.t("home.collection"))
                        .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    metadataBar(collection)
                }
                .padding(TVDesignTokens.Spacing.xxl)
            }
            .frame(height: 600)
            .clipped()
        }

        private func metadataBar(_ collection: CollectionDetail) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                if let available = collection.availableMovies,
                   let total = collection.totalMovies
                {
                    let label = total > available
                        ? "\(available) \(localization.t("vod.collection.of")) \(total) \(localization.t("vod.collection.movies"))"
                        : "\(available) \(localization.t("vod.collection.movies"))"
                    Text(label)
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                if let avgRating = collection.averageRating {
                    HStack(spacing: TVDesignTokens.Spacing.xs) {
                        Image(systemName: "star.fill")
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                        Text(avgRating)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                    }
                    .foregroundStyle(DesignTokens.Warning.default)
                }
            }
        }
    }

#endif
