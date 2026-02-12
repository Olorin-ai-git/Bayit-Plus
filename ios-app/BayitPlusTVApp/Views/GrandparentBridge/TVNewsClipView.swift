#if os(tvOS)
import AVKit
import BayitCore
import BayitDesignSystem
import SwiftUI

struct TVNewsClipView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    let avatarId: String
    let profileId: String
    var onClose: (() -> Void)?

    @State private var clips: [BridgeNewsClip] = []
    @State private var selectedIdx = 0
    @State private var phase: Phase = .loading
    @State private var player: AVPlayer?
    @State private var error: String?
    private let logger = BayitLogger(category: "TVNewsClip")
    private enum Phase { case loading, idle, sharing }

    private var selectedClip: BridgeNewsClip? {
        guard selectedIdx < clips.count else { return nil }
        return clips[selectedIdx]
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            switch phase {
            case .loading: loadingBody
            case .idle, .sharing: contentBody
            }
        }
        .onAppear { loadClips() }
        .onExitCommand { onClose?() }
    }

    private var loadingBody: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ProgressView().tint(.white)
            Text(localization.t("grandparentBridge.title"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundColor(.white.opacity(0.6))
        }
    }

    private var contentBody: some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            // Left side: video player
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                if let clip = selectedClip {
                    if let videoPath = clip.videoGcsPath, let url = URL(string: videoPath) {
                        VideoPlayer(player: player ?? AVPlayer(url: url))
                            .frame(height: 400)
                            .clipShape(RoundedRectangle(cornerRadius: 20))
                            .onAppear {
                                if player == nil { player = AVPlayer(url: url) }
                            }
                    } else {
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.white.opacity(0.05))
                            .frame(height: 400)
                            .overlay(
                                Image(systemName: "play.circle")
                                    .font(.system(size: 48))
                                    .foregroundColor(.white.opacity(0.3))
                            )
                    }

                    vocabSection(clip: clip)
                }
            }
            .frame(maxWidth: .infinity)

            // Right side: clip list
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("grandparentBridge.clips.title"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(.white)

                ScrollView {
                    LazyVStack(spacing: TVDesignTokens.Spacing.sm) {
                        ForEach(Array(clips.enumerated()), id: \.element.id) { index, clip in
                            Button {
                                selectedIdx = index
                                if let path = clip.videoGcsPath, let url = URL(string: path) {
                                    player = AVPlayer(url: url)
                                }
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(String(clip.scriptTextHe.prefix(30)))
                                            .foregroundColor(.white)
                                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                                            .lineLimit(1)
                                        Text(clip.createdAt)
                                            .foregroundColor(.white.opacity(0.4))
                                            .font(.system(size: TVDesignTokens.FontSize.caption))
                                    }
                                    Spacer()
                                    if index == selectedIdx {
                                        Circle()
                                            .fill(Color.blue)
                                            .frame(width: 10, height: 10)
                                    }
                                }
                                .padding(TVDesignTokens.Spacing.md)
                                .background(index == selectedIdx ? Color.blue.opacity(0.15) : Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                            }
                            .buttonStyle(.card)
                            .tvFocusStyle()
                        }
                    }
                }

                if clips.isEmpty {
                    Text(localization.t("grandparentBridge.clips.empty"))
                        .foregroundColor(.white.opacity(0.4))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                }
            }
            .frame(width: 400)
        }
        .padding(TVDesignTokens.Spacing.xl)
    }

    @ViewBuilder
    private func vocabSection(clip: BridgeNewsClip) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            ForEach(clip.vocabularyFeatured, id: \.self) { word in
                Text(word)
                    .font(.system(size: TVDesignTokens.FontSize.caption, weight: .medium))
                    .foregroundColor(.blue)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(Color.blue.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }

        Text(localization.t("grandparentBridge.clips.featured", ["count": "\(clip.vocabularyFeatured.count)"]))
            .font(.system(size: TVDesignTokens.FontSize.caption))
            .foregroundColor(.white.opacity(0.4))
    }

    private func loadClips() {
        Task {
            do {
                let fetched = try await repos.grandparentBridgeRepository.fetchClips(
                    profileId: profileId, limit: 20, offset: 0
                )
                await MainActor.run {
                    clips = fetched
                    phase = .idle
                    if let first = fetched.first, let path = first.videoGcsPath, let url = URL(string: path) {
                        player = AVPlayer(url: url)
                    }
                }
                logger.info("Loaded clips: \(fetched.count)")
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    phase = .idle
                }
                logger.error("Failed to load clips: \(error)")
            }
        }
    }
}
#endif
