import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Detail screen for an audiobook showing cover art, metadata, chapters, and playback controls.
///
/// Chapter list, playback controls, and playback helpers are in
/// `AudiobookChapterList.swift`.
struct AudiobookDetailView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(AudioPlaybackManager.self) var audioManager
    @Environment(LocalizationManager.self) var localization
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
                    repository: repos.audiobook,
                    mediaRepository: repos.media
                )
            }
            await viewModel?.load()
        }
    }

    private func detailContent(_ audiobook: Audiobook, vm: AudiobookDetailViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            coverSection(audiobook)
            metadataSection(audiobook)
            playbackControls(audiobook, vm: vm)
            chapterList(audiobook, vm: vm)
        }
        .padding(.vertical, DesignTokens.Spacing.lg)
    }
}
