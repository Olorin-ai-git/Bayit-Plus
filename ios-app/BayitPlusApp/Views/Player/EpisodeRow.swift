import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Episode row card for the episode list
struct EpisodeRow: View {
    @Environment(LocalizationManager.self) private var localization
    let episode: EpisodeItem
    let progress: Double?
    let downloadStatus: DownloadStatus?
    let onTap: () -> Void
    let onDownload: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    ZStack(alignment: .center) {
                        episodeThumbnail
                            .frame(width: 120, height: 68)
                            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

                        if progress != nil {
                            Image(systemName: "play.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.white)
                                .shadow(color: .black.opacity(0.5), radius: 2)
                        }
                    }

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        if let number = episode.episodeNumber {
                            Text("\(localization.t("player.episode")) \(number)")
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundColor(DesignTokens.Text.muted)
                        }

                        Text(episode.title ?? localization.t("player.episode"))
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundColor(DesignTokens.Text.primary)
                            .lineLimit(2)

                        if let duration = episode.duration {
                            Text(duration)
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundColor(DesignTokens.Text.muted)
                        }
                    }

                    Spacer()

                    HStack(spacing: DesignTokens.Spacing.sm) {
                        downloadIcon
                        Image(systemName: progress != nil ? "play.circle.fill" : "play.circle")
                            .font(.system(size: 28))
                            .foregroundColor(DesignTokens.Primary.default)
                    }
                }

                if let progress, progress > 0 {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(DesignTokens.Glass.bg)
                                .frame(height: 3)

                            RoundedRectangle(cornerRadius: 2)
                                .fill(DesignTokens.Primary.default)
                                .frame(
                                    width: geo.size.width * min(progress, 1.0),
                                    height: 3
                                )
                        }
                    }
                    .frame(height: 3)
                    .padding(.top, DesignTokens.Spacing.xs)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .glassCard()
        }
        .buttonStyle(.plain)
    }

    private var downloadIcon: some View {
        let isDownloaded = downloadStatus == .completed
        let isActive = downloadStatus == .downloading || downloadStatus == .queued || downloadStatus == .paused
        return Button(action: onDownload) {
            Image(systemName: isDownloaded ? "checkmark.circle.fill" : "arrow.down.circle")
                .font(.system(size: 22))
                .foregroundColor(isDownloaded ? .green : (isActive ? DesignTokens.Primary.default : DesignTokens.Text.muted))
        }
        .buttonStyle(.plain)
        .disabled(isActive || isDownloaded)
    }

    private var episodeThumbnail: some View {
        Group {
            if let urlStr = episode.thumbnail, let url = URL(string: urlStr) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        DesignTokens.Glass.bgMedium
                    }
                }
            } else {
                DesignTokens.Glass.bgMedium
            }
        }
    }
}
