import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS focus-navigable episode gallery for Star in Story.
/// Consumption-only: no photo upload or avatar creation on tvOS.
struct TVStarStoryGalleryView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @State private var viewModel: StarStoryViewModel?

    let profileId: String

    private let gridColumns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.episodes.isEmpty {
                    loadingState
                } else if let error = vm.errorMessage, vm.episodes.isEmpty {
                    tvErrorState(error) { Task { await vm.loadEpisodes(profileId: profileId) } }
                } else {
                    contentSections(vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = StarStoryViewModel(repository: repos.starStory)
            }
            await viewModel?.loadAvatars(profileId: profileId)
            await viewModel?.loadEpisodes(profileId: profileId)
        }
    }

    @ViewBuilder
    private func contentSections(_ vm: StarStoryViewModel) -> some View {
        LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
            headerSection
            if !vm.avatars.isEmpty { avatarShelf(vm) }
            if !vm.episodes.isEmpty { episodeGrid(vm) } else { emptyState }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
    }

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "sparkles")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.default)
            Text("Star in Story")
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text(localization.t("starStory.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    private func avatarShelf(_ vm: StarStoryViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("starStory.characters"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(vm.avatars) { avatar in avatarFocusCard(avatar) }
                }
            }
            .focusSection()
        }
    }

    private func avatarFocusCard(_ avatar: StarStoryAvatar) -> some View {
        Button {} label: {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                if let urlStr = avatar.primaryAvatarUrl, let url = URL(string: urlStr) {
                    AsyncImage(url: url) { phase in
                        if case .success(let img) = phase {
                            img.resizable().aspectRatio(contentMode: .fill)
                        } else { avatarPlaceholder }
                    }
                    .frame(width: 120, height: 120).clipShape(Circle())
                } else { avatarPlaceholder }
                Text(avatar.childFirstName)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(avatar.style.displayName)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(width: 200, height: 240)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
        .buttonStyle(.card).tvFocusStyle()
    }

    private var avatarPlaceholder: some View {
        ZStack {
            Circle().fill(DesignTokens.Glass.bgStrong).frame(width: 120, height: 120)
            Image(systemName: "sparkles")
                .font(.system(size: TVDesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Primary.default)
        }
    }

    private func episodeGrid(_ vm: StarStoryViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("starStory.episodes"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            LazyVGrid(columns: gridColumns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(vm.episodes) { episode in
                    GlassFocusPoster(
                        thumbnailURL: episode.thumbnailUrl,
                        title: episode.title,
                        subtitle: "\(episode.theme) - \(episode.formattedDuration)",
                        onSelect: {
                            coordinator.presentPlayer(contentId: episode.episodeId, contentType: .vod)
                        }
                    )
                    .overlay(alignment: .topTrailing) {
                        Text("#\(episode.episodeNumber)")
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .padding(.horizontal, TVDesignTokens.Spacing.sm)
                            .padding(.vertical, TVDesignTokens.Spacing.xs)
                            .background(DesignTokens.Glass.bgStrong)
                            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
                            .padding(TVDesignTokens.Spacing.sm)
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "film.stack")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("starStory.noEpisodes"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)
            Text(localization.t("starStory.createEpisodesHint"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, minHeight: 300)
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
            Text(localization.t("starStory.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
