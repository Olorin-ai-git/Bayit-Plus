#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    struct TVActorDetailView: View {
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(TVNavigationCoordinator.self) var coordinator
        @Environment(LocalizationManager.self) var localization
        @State private var viewModel: ActorDetailViewModel?
        @State private var didPushBreadcrumb = false

        let actorName: String

        var body: some View {
            VStack(spacing: 0) {
                TVBreadcrumbBar()
                ScrollView(.vertical, showsIndicators: false) {
                    if let vm = viewModel {
                        if vm.isLoading && vm.actor == nil {
                            loadingState
                        } else if let error = vm.error, vm.actor == nil {
                            tvErrorState(error) {
                                Task { await vm.loadActor() }
                            }
                        } else if let actor = vm.actor {
                            actorContent(actor)
                        }
                    } else {
                        loadingState
                    }
                }
            }
            .toolbar(.visible, for: .tabBar)
            .background(DesignTokens.Background.primary)
            .onAppear {
                guard !didPushBreadcrumb else { return }
                didPushBreadcrumb = true
                coordinator.pushBreadcrumb(label: actorName, icon: "person.fill")
            }
            .onDisappear {
                guard didPushBreadcrumb else { return }
                didPushBreadcrumb = false
                coordinator.popBreadcrumb()
            }
            .task {
                if viewModel == nil {
                    viewModel = ActorDetailViewModel(
                        actorName: actorName,
                        repository: repos.actor
                    )
                }
                await viewModel?.loadActor()
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

        // MARK: - Content

        private func actorContent(_ actor: ActorDetail) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxl) {
                actorHeader(actor)

                exploreButton(actor)

                if let biography = actor.biography, !biography.isEmpty {
                    biographyCard(biography)
                }

                if !actor.movies.isEmpty {
                    filmographySection(actor.movies)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }

        private func exploreButton(_ actor: ActorDetail) -> some View {
            Button {} label: {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(systemName: "film")
                    Text("\(localization.t("vod.actor.explore")) (\(actor.movieCount))")
                }
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                )
            }
            .tvCardStyle()
            .frame(maxWidth: .infinity, alignment: .center)
        }

        // MARK: - Header

        private func actorHeader(_ actor: ActorDetail) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                actorPhoto(actor.profileUrl)

                Text(actor.name)
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)

                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Text("\(actor.movieCount) \(localization.t("vod.actor.films"))")
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.muted)

                    if let birthday = actor.birthday {
                        Text(birthday)
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }

                if let place = actor.placeOfBirth {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Text(localization.t("vod.actor.bornIn"))
                            .foregroundStyle(DesignTokens.Text.muted)
                        Text(place)
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    .font(.system(size: TVDesignTokens.FontSize.md))
                }
            }
            .frame(maxWidth: .infinity)
        }

        private func actorPhoto(_ profileUrl: String?) -> some View {
            Group {
                if let profileUrl, let url = URL(string: profileUrl) {
                    CachedAsyncImage(url: url) { phase in
                        if case let .success(image) = phase {
                            image.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            placeholderCircle
                        }
                    }
                } else {
                    placeholderCircle
                }
            }
            .frame(width: 240, height: 240)
            .clipShape(Circle())
            .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 3))
            .shadow(color: .black.opacity(0.3), radius: 12, y: 6)
        }

        private var placeholderCircle: some View {
            Circle()
                .fill(DesignTokens.Glass.bgMedium)
                .overlay(
                    Image(systemName: "person.fill")
                        .foregroundStyle(DesignTokens.Text.muted)
                        .font(.system(size: 80))
                )
        }
    }

    // MARK: - Biography & Filmography

    extension TVActorDetailView {
        func biographyCard(_ text: String) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("vod.actor.biography"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(text)
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineSpacing(6)
                    .lineLimit(10)
            }
            .padding(TVDesignTokens.Spacing.xl)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster))
        }

        func filmographySection(_ movies: [ActorMovie]) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                Text(localization.t("vod.actor.filmography"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                ForEach(Array(movies.enumerated()), id: \.element.id) { index, movie in
                    tvMovieRow(index: index + 1, movie: movie)
                }
            }
        }

        func tvMovieRow(index: Int, movie: ActorMovie) -> some View {
            Button {
                coordinator.fullscreenRoute = .movieDetail(movieId: movie.id)
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Text("\(index)")
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .frame(width: 50, alignment: .center)

                    if let thumb = movie.thumbnail, let url = URL(string: thumb) {
                        CachedAsyncImage(url: url) { phase in
                            if case let .success(image) = phase {
                                image.resizable().aspectRatio(contentMode: .fill)
                            } else {
                                DesignTokens.Glass.bg
                            }
                        }
                        .frame(width: 160, height: 90)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
                    }

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                        Text(movie.title)
                            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(1)

                        HStack(spacing: TVDesignTokens.Spacing.md) {
                            if let year = movie.year {
                                Text(String(year))
                                    .foregroundStyle(DesignTokens.Text.muted)
                            }
                            if let rating = movie.rating {
                                HStack(spacing: TVDesignTokens.Spacing.xs) {
                                    Image(systemName: "star.fill")
                                    Text(rating.value)
                                }
                                .foregroundStyle(DesignTokens.Warning.default)
                            }
                        }
                        .font(.system(size: TVDesignTokens.FontSize.md))
                    }

                    Spacer()
                }
                .padding(TVDesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bg)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
            }
            .tvCardStyle()
        }
    }
#endif
