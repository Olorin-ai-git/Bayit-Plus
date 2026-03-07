import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Home shelf row showing BYOC content (Plex + YouTube) on iOS.
struct BYOCShelfRow: View {
    @Environment(BYOCSourceManager.self) private var byocManager
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        if !byocManager.plexItems.isEmpty {
            plexSection
        }
        if !byocManager.youtubeItems.isEmpty {
            youtubeSection
        }
    }

    // MARK: - Plex

    private var plexSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(
                title: localization.t("byoc.fromPlex"),
                icon: "server.rack"
            )

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(byocManager.plexItems) { item in
                        contentCard(item: item)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    // MARK: - YouTube

    private var youtubeSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionHeader(
                title: localization.t("byoc.fromYouTube"),
                icon: "play.rectangle.fill"
            )

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(byocManager.youtubeItems) { item in
                        youtubeCard(item: item)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    // MARK: - Components

    private func sectionHeader(title: String, icon: String) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Primary.default)
            Text(title)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func contentCard(item: BYOCContentItem) -> some View {
        Button {
            if let url = item.streamURL {
                UIApplication.shared.open(url)
            }
        } label: {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                thumbnailView(url: item.thumbnailURL, aspectRatio: 16 / 9)
                Text(item.title)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(2)
            }
            .frame(width: 200)
        }
    }

    private func youtubeCard(item: BYOCContentItem) -> some View {
        Button {
            if let url = item.streamURL {
                UIApplication.shared.open(url)
            }
        } label: {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                ZStack(alignment: .topTrailing) {
                    thumbnailView(url: item.thumbnailURL, aspectRatio: 16 / 9)
                    Text("YT")
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, DesignTokens.Spacing.xs)
                        .padding(.vertical, 2)
                        .background(Color.red)
                        .cornerRadius(4)
                        .padding(DesignTokens.Spacing.xs)
                }
                Text(item.title)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(2)
            }
            .frame(width: 200)
        }
    }

    private func thumbnailView(url: URL?, aspectRatio: CGFloat) -> some View {
        Group {
            if let url {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    DesignTokens.Glass.bgMedium
                }
            } else {
                DesignTokens.Glass.bgMedium
            }
        }
        .aspectRatio(aspectRatio, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }
}
