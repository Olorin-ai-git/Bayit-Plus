import BayitCore
import BayitDesignSystem
import BayitMedia
import SwiftUI

struct TVMovieDetailView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @State private var viewModel: MovieDetailViewModel?

    let movieId: String
    private let logger = BayitLogger(category: "TVMovieDetail")

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.detail == nil {
                    loadingState
                } else if let error = vm.error, vm.detail == nil {
                    tvErrorState(error) {
                        Task { await vm.loadDetail() }
                    }
                } else if let detail = vm.detail {
                    detailContent(detail, vm: vm)
                }
            } else {
                loadingState
            }
        }
        .background(DesignTokens.Background.primary)
        .ignoresSafeArea()
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
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxl) {
            backdropSection(detail)
            actionButtons(detail, vm: vm)
            descriptionSection(detail)

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
            if let urlStr = detail.backdrop ?? detail.thumbnail,
               let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure, .empty:
                        DesignTokens.Glass.bg
                    @unknown default:
                        DesignTokens.Glass.bg
                    }
                }
            } else {
                DesignTokens.Glass.bg
            }

            LinearGradient(
                colors: [.clear, DesignTokens.Background.primary],
                startPoint: .center,
                endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(detail.title ?? "Untitled")
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    if let year = detail.year {
                        Text(String(year))
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    if let duration = detail.duration {
                        Text(duration)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    if let rating = detail.rating?.value {
                        HStack(spacing: TVDesignTokens.Spacing.xs) {
                            Image(systemName: "star.fill")
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                            Text(rating)
                                .font(.system(size: TVDesignTokens.FontSize.md))
                        }
                        .foregroundStyle(DesignTokens.Warning.default)
                    }
                }
            }
            .padding(TVDesignTokens.Spacing.xxl)
        }
        .frame(height: 600)
        .clipped()
    }

    private func actionButtons(_ detail: ContentDetail, vm: MovieDetailViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            GlassButton(
                "Play",
                variant: .primary,
                size: .large,
                action: {
                    logger.info("Playing movie", context: ["movieId": movieId])
                    coordinator.presentPlayer(
                        contentId: detail.id,
                        contentType: .vod
                    )
                }
            )
            .frame(width: 400)
            .buttonStyle(.card)
            .tvFocusStyle()

            if vm.hasTrailer {
                GlassButton(
                    "Trailer",
                    variant: .secondary,
                    size: .large,
                    action: {
                        logger.info("Playing trailer", context: ["movieId": movieId])
                    }
                )
                .frame(width: 300)
                .buttonStyle(.card)
                .tvFocusStyle()
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
    }

    private func descriptionSection(_ detail: ContentDetail) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            if let genre = detail.genre {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    ForEach(genre.components(separatedBy: ", "), id: \.self) { tag in
                        GlassChip(title: tag, isSelected: false, onTap: {})
                    }
                }
            }

            if let description = detail.description {
                Text(description)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(8)
                    .lineSpacing(TVDesignTokens.Spacing.xs)
            }

            if let director = detail.director {
                Text("Director: \(director)")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: 1200, alignment: .leading)
    }

    private func castSection(_ cast: [String]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("Cast")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(cast, id: \.self) { member in
                        VStack(spacing: TVDesignTokens.Spacing.md) {
                            Circle()
                                .fill(DesignTokens.Glass.bg)
                                .frame(width: 180, height: 180)
                                .overlay(
                                    Text(String(member.prefix(1)))
                                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                                        .foregroundStyle(DesignTokens.Text.secondary)
                                )

                            Text(member)
                                .font(.system(size: TVDesignTokens.FontSize.md))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .lineLimit(2)
                                .multilineTextAlignment(.center)
                                .frame(width: 180)
                        }
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
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

extension TVMovieDetailView {
    private func relatedSection(_ items: [RelatedItem]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("Related")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(items) { item in
                        GlassFocusPoster(
                            thumbnailURL: item.thumbnail,
                            title: item.title ?? "Untitled",
                            subtitle: relatedSubtitle(item),
                            aspectRatio: 2 / 3,
                            onSelect: {
                                logger.info("Selected related item", context: ["itemId": item.id])
                            }
                        )
                        .frame(width: 260)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
    }

    private func relatedSubtitle(_ item: RelatedItem) -> String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }
}
