#if os(tvOS)
    import AVFoundation
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Audio & Date Helpers

    extension TVFeedbackView {
        func audioPlaybackButton(_ item: FeedbackItem) -> some View {
            Button {
                toggleAudioPlayback(item)
            } label: {
                HStack(spacing: TVDesignTokens.Spacing.md) {
                    Image(systemName: playingAudioId == item.id ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.xxxl))
                        .foregroundStyle(DesignTokens.Primary.default)

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                        Text(localization.t("zehAni.feedback.voiceMessage"))
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                            .foregroundStyle(DesignTokens.Text.primary)

                        HStack(spacing: TVDesignTokens.Spacing.xs) {
                            ForEach(0 ..< 5) { index in
                                Circle()
                                    .fill(playingAudioId == item.id ? DesignTokens.Primary.default : DesignTokens.Text.muted)
                                    .frame(width: 6, height: 6)
                                    .scaleEffect(playingAudioId == item.id && index % 2 == 0 ? 1.2 : 1.0)
                                    .animation(
                                        playingAudioId == item.id
                                            ? .easeInOut(duration: 0.6).repeatForever(autoreverses: true)
                                            : .default,
                                        value: playingAudioId
                                    )
                            }
                        }
                    }
                    Spacer()
                }
                .padding(TVDesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
        }

        func toggleAudioPlayback(_ item: FeedbackItem) {
            if playingAudioId == item.id {
                audioPlayer?.pause()
                audioPlayer = nil
                playingAudioId = nil
            } else {
                playingAudioId = item.id
                if let audioUrl = item.audioUrl {
                    playAudio(from: audioUrl)
                }
            }
        }

        func playAudio(from urlString: String) {
            guard let url = URL(string: urlString) else { return }
            audioPlayer = AVPlayer(url: url)
            audioPlayer?.play()

            NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: audioPlayer?.currentItem,
                queue: .main
            ) { [weak audioPlayer] _ in
                audioPlayer?.seek(to: .zero)
                playingAudioId = nil
            }
        }

        func formatDate(_ dateString: String) -> String {
            let formatter = ISO8601DateFormatter()
            guard let date = formatter.date(from: dateString) else { return dateString }
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .short
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
    }

#endif
