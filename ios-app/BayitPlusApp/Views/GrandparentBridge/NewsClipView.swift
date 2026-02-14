import AVKit
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct NewsClipView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let avatarId: String
    let profileId: String
    var sessionSummary: [String: Any]?
    var onClose: (() -> Void)?

    @State private var clips: [BridgeNewsClip] = []
    @State private var selectedClip: BridgeNewsClip?
    @State private var loading = true
    @State private var generating = false
    @State private var error: String?
    @State private var showShareSheet = false
    @State private var player: AVPlayer?

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 20) {
                    headerSection
                    if generating { generatingView }
                    if let clip = selectedClip { clipDetailSection(clip: clip) }
                    if clips.isEmpty && !loading && !generating { emptyView }
                    clipListSection
                }
                .padding(24)
            }
        }
        .onAppear { loadClips() }
        .sheet(isPresented: $showShareSheet) {
            if let clip = selectedClip {
                ShareSheetView(clip: clip, repository: repos.grandparentBridgeRepository)
            }
        }
    }

    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(localization.t("grandparentBridge.title"))
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                Text(localization.t("grandparentBridge.subtitle"))
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.5))
            }
            Spacer()
            if sessionSummary != nil {
                Button(localization.t("grandparentBridge.generateClip")) {
                    generateClip()
                }
                .buttonStyle(.borderedProminent)
                .disabled(generating)
            }
        }
    }

    private var generatingView: some View {
        VStack(spacing: 12) {
            ProgressView().tint(.white)
            Text(localization.t("grandparentBridge.generating"))
                .foregroundColor(.white.opacity(0.6))
                .font(.system(size: 14))
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    @ViewBuilder
    private func clipDetailSection(clip: BridgeNewsClip) -> some View {
        if let videoPath = clip.videoGcsPath, let url = URL(string: videoPath) {
            VideoPlayer(player: player ?? AVPlayer(url: url))
                .frame(height: 220)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .onAppear { player = AVPlayer(url: url) }
        }

        LazyVGrid(columns: [GridItem(.adaptive(minimum: 80), spacing: 8)], spacing: 8) {
            ForEach(clip.vocabularyFeatured, id: \.self) { word in
                Text(word)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(DesignTokens.Primary.p400)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .background(DesignTokens.Primary.p400.opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }

        Text(localization.t("grandparentBridge.clips.featured", ["count": "\(clip.vocabularyFeatured.count)"]))
            .font(.system(size: 13))
            .foregroundColor(.white.opacity(0.5))

        Button(localization.t("grandparentBridge.share.title")) {
            showShareSheet = true
        }
        .buttonStyle(.bordered)
    }

    private var emptyView: some View {
        Text(localization.t("grandparentBridge.clips.empty"))
            .foregroundColor(.white.opacity(0.4))
            .font(.system(size: 15))
            .padding(.top, 40)
    }

    private var clipListSection: some View {
        ForEach(clips) { clip in
            Button {
                selectedClip = clip
                if let path = clip.videoGcsPath, let url = URL(string: path) {
                    player = AVPlayer(url: url)
                }
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(String(clip.scriptTextHe.prefix(40)))
                            .foregroundColor(.white)
                            .font(.system(size: 15, weight: .semibold))
                        Text(clip.createdAt)
                            .foregroundColor(.white.opacity(0.4))
                            .font(.system(size: 12))
                    }
                    Spacer()
                    if clip.id == selectedClip?.id {
                        Circle().fill(DesignTokens.Primary.p400).frame(width: 8, height: 8)
                    }
                }
                .padding(16)
                .background(clip.id == selectedClip?.id ? DesignTokens.Primary.p400.opacity(0.1) : .white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(clip.id == selectedClip?.id ? DesignTokens.Primary.p400.opacity(0.5) : .white.opacity(0.08), lineWidth: 1)
                )
            }
        }
    }

    private func loadClips() {
        Task {
            do {
                let fetched = try await repos.grandparentBridgeRepository.fetchClips(
                    profileId: profileId, limit: 20, offset: 0
                )
                await MainActor.run {
                    clips = fetched
                    selectedClip = fetched.first
                    loading = false
                    if let first = fetched.first, let path = first.videoGcsPath, let url = URL(string: path) {
                        player = AVPlayer(url: url)
                    }
                }
            } catch {
                await MainActor.run { self.error = error.localizedDescription; loading = false }
            }
        }
    }

    private func generateClip() {
        guard let summary = sessionSummary else { return }
        generating = true
        Task {
            do {
                let clip = try await repos.grandparentBridgeRepository.generateClip(
                    profileId: profileId, avatarId: avatarId, sessionSummary: summary
                )
                await MainActor.run {
                    clips.insert(clip, at: 0)
                    selectedClip = clip
                    generating = false
                }
            } catch {
                await MainActor.run { self.error = error.localizedDescription; generating = false }
            }
        }
    }
}
