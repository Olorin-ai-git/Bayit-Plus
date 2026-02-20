import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVAudiobookDetailView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: AudiobookDetailViewModel?

    let audiobookId: String
    private let logger = BayitLogger(category: "TVAudiobookDetail")

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
                    repository: repos.audiobook
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
            .frame(width: 400)
            .buttonStyle(.card)
            .tvFocusStyle()

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

    private func chapterList(_ chapters: [AudiobookChapter], vm: AudiobookDetailViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("chapters.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            VStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(chapters.indices, id: \.self) { index in
                    chapterRow(chapters[index], index: index, vm: vm)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        }
    }

    private func chapterRow(_ chapter: AudiobookChapter, index: Int, vm: AudiobookDetailViewModel) -> some View {
        GlassCard {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Text("\(index + 1)")
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .frame(width: 80)

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text(chapter.title ?? "Chapter \(index + 1)")
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    if let duration = chapter.duration {
                        Text(duration)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    } else if let startTime = chapter.startTime,
                              let endTime = chapter.endTime {
                        Text(formatTimeRange(start: startTime, end: endTime))
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                GlassButton(
                    "Play",
                    variant: .secondary,
                    size: .medium,
                    action: {
                        vm.selectChapter(chapter)
                        logger.info("Playing chapter", context: [
                            "audiobookId": audiobookId,
                            "chapterIndex": String(index)
                        ])
                        coordinator.presentPlayer(
                            contentId: audiobookId,
                            contentType: .audiobook
                        )
                    }
                )
                .frame(width: 200)
            }
            .padding(TVDesignTokens.Spacing.lg)
        }
        .buttonStyle(.card)
        .tvFocusStyle()
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

    private func formatTimeRange(start: Double, end: Double) -> String {
        let duration = end - start
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }
}
