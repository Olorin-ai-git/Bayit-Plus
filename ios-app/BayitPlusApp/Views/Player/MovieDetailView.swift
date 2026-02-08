import BayitDesignSystem
import SwiftUI

/// Movie detail screen with backdrop, metadata, cast, and related content
struct MovieDetailView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: MovieDetailViewModel?

    let movieId: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.detail == nil {
                    loadingState
                } else if let error = vm.error, vm.detail == nil {
                    ErrorStateView(message: error) {
                        Task { await vm.loadDetail() }
                    }
                } else if let detail = vm.detail {
                    detailContent(detail, vm: vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if viewModel == nil {
                viewModel = MovieDetailViewModel(
                    movieId: movieId,
                    repository: repos.content
                )
            }
            await viewModel?.loadDetail()
        }
    }

    private func detailContent(_ detail: ContentDetail, vm: MovieDetailViewModel) -> some View {
        LazyVStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            backdropSection(detail)
            metadataSection(detail)
            actionButtons(detail)

            if let cast = detail.cast, !cast.isEmpty {
                castSection(cast)
            }

            if !vm.relatedItems.isEmpty {
                relatedSection(vm.relatedItems)
            }
        }
    }

    private func backdropSection(_ detail: ContentDetail) -> some View {
        ZStack(alignment: .bottomLeading) {
            backdropImage(detail)
                .frame(height: 280)
                .clipped()

            LinearGradient(
                colors: [.clear, DesignTokens.Background.primary],
                startPoint: .center,
                endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(detail.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)

                HStack(spacing: DesignTokens.Spacing.md) {
                    if let year = detail.year { metadataTag(String(year)) }
                    if let duration = detail.duration { metadataTag(duration) }
                    if let rating = detail.rating { metadataTag(rating.value) }
                    if let genre = detail.genre { metadataTag(genre) }
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }

    private func backdropImage(_ detail: ContentDetail) -> some View {
        Group {
            if let urlStr = detail.backdrop ?? detail.thumbnail,
               let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        DesignTokens.Glass.bgMedium
                    }
                }
            } else {
                DesignTokens.Glass.bgMedium
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func metadataTag(_ text: String) -> some View {
        Text(text)
            .font(.system(size: DesignTokens.FontSize.xs))
            .foregroundColor(DesignTokens.Text.secondary)
    }

    private func metadataSection(_ detail: ContentDetail) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            if let description = detail.description {
                Text(description)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .lineSpacing(4)
            }

            if let director = detail.director {
                HStack {
                    Text("Director:")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.muted)
                    Text(director)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.primary)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func actionButtons(_ detail: ContentDetail) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            GlassButton("Play", variant: .primary, size: .large,
                         icon: Image(systemName: "play.fill")) {
                coordinator.presentFullscreen(.player(
                    contentId: detail.id,
                    contentType: .movie
                ))
            }

            if viewModel?.hasTrailer == true, let trailerUrl = detail.trailerUrl {
                GlassButton("Trailer", variant: .secondary, size: .large,
                             icon: Image(systemName: "film")) {
                    coordinator.presentFullscreen(.player(
                        contentId: trailerUrl,
                        contentType: .movie
                    ))
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func castSection(_ cast: [String]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("Cast")
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            Text(cast.joined(separator: ", "))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.secondary)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func relatedSection(_ items: [RelatedItem]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("Related")
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(items) { item in
                        GlassContentCard(
                            thumbnailURL: item.thumbnail,
                            title: item.title,
                            subtitle: relatedSubtitle(item),
                            aspectRatio: 2 / 3,
                            width: 120
                        ) {
                            coordinator.navigate(to: .movieDetail(movieId: item.id))
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    private func relatedSubtitle(_ item: RelatedItem) -> String? {
        let parts = [item.year.map(String.init), item.duration].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private var loadingState: some View { MovieDetailLoadingView() }
}
