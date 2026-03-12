import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// BYOC movie card matching native VODCard design with enrichment overlays.
struct BYOCMovieCard: View {
    let item: BYOCContentItem
    let enrichmentResult: BYOCEnrichmentResult?
    let watchProgress: Double?
    let onTap: () -> Void

    @Environment(LocalizationManager.self) private var localization

    private var isLandscape: Bool {
        item.sourceType == .youtube
    }

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                posterImage
                    .aspectRatio(
                        isLandscape ? 16.0 / 9.0 : 2.0 / 3.0,
                        contentMode: .fit
                    )
                    .clipShape(
                        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    )
                    .overlay(alignment: .bottomTrailing) { subtitlePill }
                    .overlay(alignment: .topTrailing) { sourceBadge }
                    .overlay(alignment: .topLeading) { aiCapabilitiesBadge }

                if let progress = watchProgress, progress > 0 {
                    progressBar(progress)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title)
                        .font(.system(
                            size: DesignTokens.FontSize.sm, weight: .semibold
                        ))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let subtitle = subtitleText {
                        Text(subtitle)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }
                .padding(.top, DesignTokens.Spacing.xs)
            }
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(item.title)
        .accessibilityHint(localization.t("byoc.tapToOpen"))
    }

    // MARK: - Poster

    @ViewBuilder
    private var posterImage: some View {
        if let url = item.thumbnailURL {
            CachedAsyncImage(url: url) { phase in
                switch phase {
                case let .success(img):
                    img.resizable().aspectRatio(contentMode: .fill)
                default:
                    posterPlaceholder
                }
            }
        } else {
            posterPlaceholder
        }
    }

    private var posterPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "film")
                .font(.system(size: 28))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }

    // MARK: - Subtitle Pill

    @ViewBuilder
    private var subtitlePill: some View {
        if let result = enrichmentResult,
           !result.availableSubtitleLanguages.isEmpty
        {
            SubtitleFlagsPill(
                languages: result.availableSubtitleLanguages,
                aiLanguages: Set(result.availableSubtitleLanguages),
                size: .small
            )
            .padding(DesignTokens.Spacing.xs)
        } else if enrichmentResult == nil {
            shimmerCapsule
        }
    }

    private var shimmerCapsule: some View {
        Capsule()
            .fill(DesignTokens.Glass.bgMedium)
            .frame(width: 48, height: 16)
            .padding(DesignTokens.Spacing.xs)
    }

    // MARK: - Source Badge

    private var sourceBadge: some View {
        HStack(spacing: 3) {
            Image(systemName: sourceIconName)
                .font(.system(size: DesignTokens.FontSize.xs - 1, weight: .bold))
        }
        .foregroundColor(.white)
        .padding(.horizontal, 4)
        .padding(.vertical, 2)
        .background(sourceColor.opacity(0.85))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        .padding(DesignTokens.Spacing.xs)
    }

    private var sourceIconName: String {
        switch item.sourceType {
        case .plex: return "server.rack"
        case .youtube: return "play.rectangle.fill"
        case .iptv: return "antenna.radiowaves.left.and.right"
        case .xtream: return "tv.and.mediabox"
        }
    }

    private var sourceColor: Color {
        switch item.sourceType {
        case .plex: return Color.orange
        case .youtube: return Color.red
        case .iptv: return Color.blue
        case .xtream: return Color.purple
        }
    }

    // MARK: - AI Badge

    @ViewBuilder
    private var aiCapabilitiesBadge: some View {
        let caps = item.sourceType == .youtube
            ? BYOCCapabilities.youtubeCapabilities(for: item.contentType)
            : BYOCCapabilities.capabilities(for: item.sourceType)
        if !caps.audioOverlayOnly,
           caps.dubbing || caps.liveSubtitles || caps.interactiveSubtitles
        {
            Image(systemName: "sparkles")
                .font(.system(size: DesignTokens.FontSize.xs - 1, weight: .bold))
                .foregroundColor(.white)
                .padding(4)
                .background(DesignTokens.Primary.p600.opacity(0.85))
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                .padding(DesignTokens.Spacing.xs)
        }
    }

    // MARK: - Progress Bar

    private func progressBar(_ progress: Double) -> some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(DesignTokens.Glass.bgMedium)
                Rectangle()
                    .fill(DesignTokens.Primary.p600)
                    .frame(width: geometry.size.width * (progress / 100))
            }
        }
        .frame(height: 4)
        .clipShape(RoundedRectangle(cornerRadius: 2))
    }

    // MARK: - Subtitle Text

    private var subtitleText: String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration {
            let hours = duration / 3600
            let minutes = (duration % 3600) / 60
            if hours > 0 {
                parts.append("\(hours)h \(minutes)m")
            } else {
                parts.append("\(minutes)m")
            }
        }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }
}
