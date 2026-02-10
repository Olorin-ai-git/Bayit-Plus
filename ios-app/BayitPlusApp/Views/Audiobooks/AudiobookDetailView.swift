import BayitDesignSystem
import SwiftUI
import UIKit

/// Detail screen for an audiobook showing cover art, metadata, chapters, and playback controls
struct AudiobookDetailView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
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
            playbackControls(vm)
            chapterList(audiobook, vm: vm)
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
            .frame(width: 200, height: 200)
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

    private func playbackControls(_ vm: AudiobookDetailViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(
                vm.isPlaying ? "Pause" : "Play",
                variant: .primary,
                size: .large
            ) {
                vm.togglePlayback()
                if vm.isPlaying, let audiobook = vm.audiobook {
                    coordinator.navigate(to: .player(
                        contentId: audiobook.id,
                        contentType: .audiobook
                    ))
                }
            }

            PlaybackSpeedControlView(
                currentSpeed: vm.playbackSpeed,
                onSpeedSelected: { speed in vm.setSpeed(speed) }
            )
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Chapter List

    private func chapterList(_ audiobook: Audiobook, vm: AudiobookDetailViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Chapters")
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            if let chapters = audiobook.chapters {
                ForEach(chapters, id: \.stableId) { chapter in
                    chapterRow(chapter, isActive: chapter.stableId == vm.currentChapter?.stableId)
                        .onTapGesture {
                            let generator = UIImpactFeedbackGenerator(style: .light)
                            generator.impactOccurred()
                            vm.selectChapter(chapter)
                        }
                }
            }
        }
    }

    private func chapterRow(_ chapter: AudiobookChapter, isActive: Bool) -> some View {
        GlassCard {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(chapter.title ?? "Chapter")
                        .font(.system(
                            size: DesignTokens.FontSize.md,
                            weight: isActive ? .semibold : .regular
                        ))
                        .foregroundColor(
                            isActive ? DesignTokens.Primary.default : DesignTokens.Text.primary
                        )

                    if let start = chapter.startTime, let end = chapter.endTime {
                        let durationMinutes = Int((end - start) / 60)
                        Text("\(durationMinutes) min")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                }

                Spacer()

                if isActive {
                    Image(systemName: "speaker.wave.2.fill")
                        .font(.system(size: 14))
                        .foregroundColor(DesignTokens.Primary.default)
                }
            }
            .padding(DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
