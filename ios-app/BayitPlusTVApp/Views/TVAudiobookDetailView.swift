import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVAudiobookDetailView: View {
    @Environment(TVRepositoryProvider.self) var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: AudiobookDetailViewModel?

    let audiobookId: String
    let logger = BayitLogger(category: "TVAudiobookDetail")

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.audiobook == nil {
                    loadingState
                } else if let error = vm.error, vm.audiobook == nil {
                    tvErrorState(error) {
                        Task { await vm.load() }
                    }
                } else if let audiobook = vm.audiobook {
                    detailContent(audiobook, vm: vm)
                }
            } else {
                loadingState
            }
        }
        .background(DesignTokens.Background.primary)
        .ignoresSafeArea()
        .task {
            if viewModel == nil {
                viewModel = AudiobookDetailViewModel(
                    audiobookId: audiobookId,
                    repository: repos.audiobook,
                    mediaRepository: repos.media
                )
            }
            await viewModel?.load()
        }
    }

    private func detailContent(_ audiobook: Audiobook, vm: AudiobookDetailViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxl) {
            audiobookHeader(audiobook)
            playbackControls(audiobook, vm: vm)

            if let chapters = audiobook.chapters, !chapters.isEmpty {
                chapterList(chapters, vm: vm)
            }
        }
        .padding(.top, TVDesignTokens.Spacing.xxl)
    }

    private func audiobookHeader(_ audiobook: Audiobook) -> some View {
        HStack(alignment: .top, spacing: TVDesignTokens.Spacing.xxxl) {
            if let urlStr = audiobook.thumbnail, let url = URL(string: urlStr) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure, .empty:
                        DesignTokens.Glass.bg
                    @unknown default:
                        DesignTokens.Glass.bg
                    }
                }
                .frame(width: 480, height: 480)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster))
                .shadow(
                    color: .black.opacity(0.3),
                    radius: 16
                )
            }

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                Text(audiobook.title ?? "Untitled")
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                if let author = audiobook.author {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Text(localization.t("audiobooks.by"))
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Text.muted)
                        Text(author)
                            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }

                if let narrator = audiobook.narrator {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Text(localization.t("audiobooks.narratedBy"))
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.muted)
                        Text(narrator)
                            .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }

                if let duration = audiobook.duration {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "clock")
                            .font(.system(size: TVDesignTokens.FontSize.md))
                        Text(duration)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                    }
                    .foregroundStyle(DesignTokens.Text.muted)
                }

                if let description = audiobook.description {
                    Text(description)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(6)
                        .lineSpacing(TVDesignTokens.Spacing.xs)
                        .frame(maxWidth: 900, alignment: .leading)
                        .padding(.top, TVDesignTokens.Spacing.md)
                }
            }
            .frame(maxWidth: 900, alignment: .leading)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
    }

    private func playbackControls(_ audiobook: Audiobook, vm: AudiobookDetailViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            GlassButton(
                "Play",
                variant: .primary,
                size: .large,
                action: {
                    logger.info("Playing audiobook", context: ["audiobookId": audiobookId])
                    coordinator.presentPlayer(
                        contentId: audiobook.id,
                        contentType: .audiobook
                    )
                }
            )

            speedControl(vm: vm)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
    }

    private func speedControl(vm: AudiobookDetailViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("audiobooks.speed"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)

            ForEach(AudiobookDetailViewModel.availableSpeeds, id: \.self) { speed in
                GlassChip(
                    title: "\(String(format: "%.2gx", speed))",
                    isSelected: vm.playbackSpeed == speed,
                    onTap: {
                        vm.setSpeed(speed)
                    }
                )
                .tvFocusStyle()
            }
        }
    }
}
