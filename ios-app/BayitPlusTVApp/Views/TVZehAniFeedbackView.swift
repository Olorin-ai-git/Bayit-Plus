#if os(tvOS)
    import AVFoundation
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Feedback Inbox View

    struct TVFeedbackView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(LocalizationManager.self) private var localization

        let profileId: String

        @State private var feedback: [FeedbackItem] = []
        @State private var isLoading = false
        @State private var error: String?
        @State var playingAudioId: String?
        @State var audioPlayer: AVPlayer?
        @FocusState private var refreshButtonFocused: Bool

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: 0) {
                    headerSection

                    if isLoading {
                        ProgressView()
                            .tint(.white)
                            .scaleEffect(1.5)
                            .frame(maxHeight: .infinity)
                    } else if feedback.isEmpty {
                        emptyState
                    } else {
                        feedbackList
                    }
                }
            }
            .task { await loadFeedback() }
            .onDisappear {
                audioPlayer?.pause()
                audioPlayer = nil
                playingAudioId = nil
            }
        }

        private var headerSection: some View {
            HStack {
                Text(localization.t("zehAni.feedback.title"))
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Button {
                    Task { await loadFeedback() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: TVDesignTokens.FontSize.xl))
                        .padding(TVDesignTokens.Spacing.md)
                }
                .buttonStyle(.card)
                .focused($refreshButtonFocused)
                .disabled(isLoading)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }

        private var emptyState: some View {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                Image(systemName: "envelope.open")
                    .font(.system(size: 120))
                    .foregroundStyle(DesignTokens.Text.muted)

                Text(localization.t("zehAni.feedback.empty"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxHeight: .infinity)
        }

        private var feedbackList: some View {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: TVDesignTokens.Spacing.lg) {
                    ForEach(feedback) { item in
                        feedbackCard(item)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.vertical, TVDesignTokens.Spacing.xl)
            }
        }

        private func feedbackCard(_ item: FeedbackItem) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                HStack {
                    Text(localization.t("zehAni.feedback.from"))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                    Text(item.contactName)
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                    Text(formatDate(item.createdAt))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                if item.audioUrl != nil {
                    audioPlaybackButton(item)
                }

                if let transcript = item.transcriptText, !transcript.isEmpty {
                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                        Text(localization.t("zehAni.feedback.voiceMessage"))
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.muted)
                        Text(transcript)
                            .font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .padding(TVDesignTokens.Spacing.md)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(DesignTokens.Glass.bgLight)
                            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                    }
                }

                if let language = item.detectedLanguage {
                    HStack(spacing: TVDesignTokens.Spacing.xs) {
                        Image(systemName: "globe")
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                        Text(language.uppercased())
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                    }
                    .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .padding(TVDesignTokens.Spacing.xl)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
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
    }

#endif
