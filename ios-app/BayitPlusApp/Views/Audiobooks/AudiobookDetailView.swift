import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Detail screen for an audiobook showing cover art, metadata, chapters, and playback controls
struct AudiobookDetailView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(AudioPlaybackManager.self) private var audioManager
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: AudiobookDetailViewModel?

    let audiobookId: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading {
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 100)
                } else if let error = vm.error {
                    ErrorStateView(message: error) {
                        Task { await vm.load() }
                    }
                } else if let audiobook = vm.audiobook {
                    detailContent(audiobook, vm: vm)
                }
            }
        }
        .background(DesignTokens.Background.primary)
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
        VStack(spacing: DesignTokens.Spacing.lg) {
            coverSection(audiobook)
            metadataSection(audiobook)
            playbackControls(audiobook)
            chapterList(audiobook)
        }
        .padding(.vertical, DesignTokens.Spacing.lg)
    }

    // MARK: - Cover

    private func coverSection(_ audiobook: Audiobook) -> some View {
        Group {
            if let urlStr = audiobook.thumbnail, let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxWidth: 200)
                            .cornerRadius(DesignTokens.Radius.lg)
                            .shadow(radius: 10)
                    default:
                        coverPlaceholder
                    }
                }
            } else {
                coverPlaceholder
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var coverPlaceholder: some View {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
            .fill(DesignTokens.Glass.bgMedium)
            .frame(width: 200, height: 280)
            .overlay {
                Image(systemName: "book.fill")
                    .font(.system(size: 48))
                    .foregroundColor(DesignTokens.Text.muted)
            }
    }

    // MARK: - Metadata

    private func metadataSection(_ audiobook: Audiobook) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(audiobook.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)

                if let author = audiobook.author {
                    metadataRow(label: "Author", value: author)
                }

                if let narrator = audiobook.narrator {
                    metadataRow(label: "Narrator", value: narrator)
                }

                if let duration = audiobook.duration {
                    metadataRow(label: "Duration", value: duration)
                }

                if let genreIds = audiobook.genreIds, !genreIds.isEmpty {
                    metadataRow(label: "Genre", value: genreIds.joined(separator: ", "))
                }

                if let description = audiobook.description {
                    Text(description)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .padding(.top, DesignTokens.Spacing.xs)
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func metadataRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.muted)
            Spacer()
            Text(value)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.secondary)
        }
    }

    // MARK: - Playback Controls

    private func playbackControls(_ audiobook: Audiobook) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(
                isAudiobookPlaying(audiobook) ? "Pause" : "Play",
                variant: .primary,
                size: .large
            ) {
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
                playAudiobook(audiobook)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Chapter List

    private func chapterList(_ audiobook: Audiobook) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            if let chapters = audiobook.chapters, !chapters.isEmpty {
                Text(localization.t("audiobooks.chapters"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .padding(.horizontal, DesignTokens.Spacing.lg)

                ForEach(chapters, id: \.stableId) { chapter in
                    chapterRow(chapter, audiobook: audiobook)
                }
            }
        }
    }

    private func chapterRow(_ chapter: AudiobookChapter, audiobook: Audiobook) -> some View {
        let isActive = isChapterPlaying(chapter)

        return GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(chapter.title ?? "Chapter")
                        .font(.system(
                            size: DesignTokens.FontSize.md,
                            weight: isActive ? .semibold : .regular
                        ))
                        .foregroundColor(
                            isActive ? DesignTokens.Primary.default : DesignTokens.Text.primary
                        )

                    if let duration = chapter.duration {
                        Text(duration)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                    } else if let start = chapter.startTime, let end = chapter.endTime {
                        let durationMinutes = Int((end - start) / 60)
                        Text("\(durationMinutes) min")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                }

                Spacer()

                if chapter.streamUrl != nil {
                    Button {
                        let generator = UIImpactFeedbackGenerator(style: .light)
                        generator.impactOccurred()
                        playChapter(chapter, audiobook: audiobook)
                    } label: {
                        Image(systemName: isActive && audioManager.isPlaying
                              ? "pause.circle.fill"
                              : "play.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(DesignTokens.Primary.default)
                    }
                } else if isActive {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.system(size: 14))
                        .foregroundColor(DesignTokens.Primary.default)
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Playback Helpers

    private func isAudiobookPlaying(_ audiobook: Audiobook) -> Bool {
        audioManager.activeContentId == audiobook.id && audioManager.isActive
    }

    private func isChapterPlaying(_ chapter: AudiobookChapter) -> Bool {
        guard let chapterId = chapter.id else { return false }
        return audioManager.activeContentId == chapterId && audioManager.isActive
    }

    private func playAudiobook(_ audiobook: Audiobook) {
        if isAudiobookPlaying(audiobook) {
            audioManager.togglePlayPause()
            return
        }

        // Play first chapter if available, otherwise play the audiobook itself
        if let firstChapter = audiobook.chapters?.first,
           let urlStr = firstChapter.streamUrl,
           let url = URL(string: urlStr) {
            let coverURL = audiobook.thumbnail.flatMap { URL(string: $0) }
            audioManager.playDirectURL(
                url: url,
                title: firstChapter.title ?? audiobook.title ?? "",
                subtitle: audiobook.author,
                artworkURL: coverURL,
                contentId: firstChapter.id ?? audiobook.id,
                contentType: .audiobook
            )
        } else {
            audioManager.play(contentId: audiobook.id, contentType: .audiobook)
        }
    }

    private func playChapter(_ chapter: AudiobookChapter, audiobook: Audiobook) {
        if isChapterPlaying(chapter) {
            audioManager.togglePlayPause()
            return
        }

        guard let urlStr = chapter.streamUrl,
              let url = URL(string: urlStr) else { return }

        let coverURL = audiobook.thumbnail.flatMap { URL(string: $0) }
        audioManager.playDirectURL(
            url: url,
            title: chapter.title ?? "Chapter",
            subtitle: audiobook.title,
            artworkURL: coverURL,
            contentId: chapter.id ?? audiobook.id,
            contentType: .audiobook
        )
    }
}
