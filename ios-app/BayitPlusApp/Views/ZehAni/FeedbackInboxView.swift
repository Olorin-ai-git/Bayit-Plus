import BayitDesignSystem
import BayitLocalization
import SwiftUI
import AVFoundation

struct FeedbackInboxView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let profileId: String

    @State private var feedback: [FeedbackItem] = []
    @State private var isLoading = false
    @State private var error: String?
    @State private var playingAudioId: String?

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: 0) {
                ZehAniBreadcrumb(currentLabel: "Feedback")

                HStack {
                    Text(localization.t("zehAni.feedback.title"))
                        .font(.system(size: DesignTokens.FontSize.xxxl, weight: .bold))
                        .foregroundColor(DesignTokens.Text.primary)
                    Spacer()
                    Button {
                        Task { await loadFeedback() }
                    } label: {
                        Image(systemName: "arrow.clockwise").font(.system(size: DesignTokens.FontSize.lg))
                    }
                    .disabled(isLoading)
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.top, DesignTokens.Spacing.lg)

                if isLoading {
                    ProgressView().tint(DesignTokens.Primary.default).frame(maxHeight: .infinity)
                } else if feedback.isEmpty {
                    VStack(spacing: DesignTokens.Spacing.lg) {
                        Image(systemName: "envelope.open").font(.system(size: DesignTokens.FontSize.hero))
                            .foregroundColor(DesignTokens.Text.muted)
                        Text(localization.t("zehAni.feedback.empty")).foregroundColor(DesignTokens.Text.secondary)
                    }
                    .frame(maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: DesignTokens.Spacing.md) {
                            ForEach(feedback) { item in
                                feedbackCard(item)
                            }
                        }
                        .padding(.horizontal, DesignTokens.Spacing.base)
                        .padding(.vertical, DesignTokens.Spacing.lg)
                    }
                }
            }
        }
        .task { await loadFeedback() }
    }

    private func feedbackCard(_ item: FeedbackItem) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text(localization.t("zehAni.feedback.from")).font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
                Text(item.contactName).font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.primary)
                Spacer()
                Text(formatDate(item.createdAt)).font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.muted)
            }

            if item.audioUrl != nil {
                audioPlaybackButton(item)
            }

            if let transcript = item.transcriptText, !transcript.isEmpty {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(localization.t("zehAni.feedback.voiceMessage"))
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                        .foregroundColor(DesignTokens.Text.muted)
                    Text(transcript).font(.system(size: DesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.primary).padding(DesignTokens.Spacing.sm)
                        .frame(maxWidth: .infinity, alignment: .leading).background(DesignTokens.Glass.bgLight)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.`default`))
                }
            } else {
                Text(localization.t("zehAni.feedback.textMessage"))
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                    .foregroundColor(DesignTokens.Text.muted)
            }

            if let language = item.detectedLanguage {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "globe").font(.system(size: DesignTokens.FontSize.xs))
                    Text(language.uppercased()).font(.system(size: DesignTokens.FontSize.xs))
                }
                .foregroundColor(DesignTokens.Text.muted)
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.`default`))
    }

    private func audioPlaybackButton(_ item: FeedbackItem) -> some View {
        Button {
            toggleAudioPlayback(item)
        } label: {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: playingAudioId == item.id ? "pause.circle.fill" : "play.circle.fill")
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundColor(DesignTokens.Primary.default)
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(localization.t("zehAni.feedback.voiceMessage"))
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                        .foregroundColor(DesignTokens.Text.primary)
                    HStack(spacing: DesignTokens.Spacing.xxs) {
                        ForEach(0..<3) { _ in
                            Circle()
                                .fill(playingAudioId == item.id ? DesignTokens.Primary.default : DesignTokens.Text.muted)
                                .frame(width: 4, height: 4)
                        }
                    }
                }
                Spacer()
            }
            .padding(DesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.`default`))
        }
    }

    @MainActor
    private func loadFeedback() async {
        isLoading = true
        error = nil
        do {
            feedback = try await repos.zehAniRepository.getFeedbackHistory(profileId: profileId)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    private func toggleAudioPlayback(_ item: FeedbackItem) {
        if playingAudioId == item.id {
            playingAudioId = nil
        } else {
            playingAudioId = item.id
            if let audioUrl = item.audioUrl {
                playAudio(from: audioUrl)
            }
        }
    }

    private func playAudio(from urlString: String) {
        guard let url = URL(string: urlString) else { return }
        Task {
            do {
                let player = AVPlayer(url: url)
                player.play()
                try await Task.sleep(nanoseconds: 1_000_000_000)
                await MainActor.run { playingAudioId = nil }
            } catch {
                await MainActor.run { playingAudioId = nil }
            }
        }
    }

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return dateString }
        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .short
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}
