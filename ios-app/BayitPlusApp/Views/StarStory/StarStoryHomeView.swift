import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Landing page for Star in Story personalized Hebrew engagement feature.
struct StarStoryHomeView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: StarStoryViewModel?
    @State private var showAvatarCreation = false
    @State private var showEpisodeGenerator = false

    let profileId: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.avatars.isEmpty {
                    loadingState
                } else if let error = vm.errorMessage, vm.avatars.isEmpty && vm.episodes.isEmpty {
                    ErrorStateView(message: error) {
                        Task { await vm.loadAvatars(profileId: profileId) }
                    }
                } else if vm.isGenerating {
                    EpisodeProgressView(viewModel: vm)
                } else {
                    contentSections(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.loadAvatars(profileId: profileId)
            await viewModel?.loadEpisodes(profileId: profileId)
        }
        .task {
            if viewModel == nil {
                viewModel = StarStoryViewModel(repository: repos.starStory)
            }
            await viewModel?.loadAvatars(profileId: profileId)
            await viewModel?.loadEpisodes(profileId: profileId)
        }
        .sheet(isPresented: $showAvatarCreation) {
            AvatarCreationView(
                profileId: profileId,
                viewModel: viewModel
            )
        }
        .sheet(isPresented: $showEpisodeGenerator) {
            if let vm = viewModel, let avatarId = vm.avatars.first?.avatarId {
                EpisodeGeneratorView(
                    profileId: profileId,
                    avatarId: avatarId,
                    viewModel: vm
                )
            }
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: StarStoryViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.lg) {
            heroSection
            avatarSection(vm)
            if !vm.episodes.isEmpty {
                episodeSection(vm)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private var heroSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "sparkles")
                .font(.system(size: DesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("starStory.title"))
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("starStory.subtitle"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.xl)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func avatarSection(_ vm: StarStoryViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("starStory.avatars"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(vm.avatars) { avatar in
                        avatarCard(avatar)
                    }
                    addAvatarButton
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    private func avatarCard(_ avatar: StarStoryAvatar) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                AsyncImage(url: URL(string: avatar.primaryAvatarUrl ?? "")) { phase in
                    if case .success(let img) = phase {
                        img.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        Image(systemName: "sparkles")
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                }
                .frame(width: 72, height: 72)
                .clipShape(Circle())

                Text(avatar.childFirstName)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(avatar.style.displayName)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(width: 110)
        }
    }

    private var addAvatarButton: some View {
        GlassButton(localization.t("starStory.addAvatar"), variant: .secondary, size: .medium) {
            showAvatarCreation = true
        }
        .frame(width: 110, height: 140)
    }

    private func episodeSection(_ vm: StarStoryViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text(localization.t("starStory.episodes"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                if !vm.avatars.isEmpty {
                    GlassButton(localization.t("starStory.newEpisode"), variant: .primary, size: .small) {
                        showEpisodeGenerator = true
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
                ],
                spacing: DesignTokens.Spacing.md
            ) {
                ForEach(vm.episodes) { episode in
                    episodeCard(episode)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private func episodeCard(_ episode: StarStoryEpisode) -> some View {
        GlassContentCard(
            thumbnailURL: episode.thumbnailUrl,
            title: episode.title,
            subtitle: "\(episode.theme) - \(episode.formattedDuration)",
            width: .infinity,
            onTap: {
                if episode.hlsUrl != nil {
                    coordinator.pushToCurrentTab(
                        .player(contentId: episode.episodeId, contentType: .movie)
                    )
                }
            }
        )
    }

    private var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ProgressView().tint(.white)
                .padding(.top, DesignTokens.Spacing.xxxxl)
        }
    }
}
