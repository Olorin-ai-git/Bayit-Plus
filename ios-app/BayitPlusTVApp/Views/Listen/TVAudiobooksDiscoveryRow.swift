#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Horizontal scrolling row of audiobook cards with cover art,
    /// author, and duration. Links to full audiobook browse view.
    struct TVAudiobooksDiscoveryRow: View {
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(LocalizationManager.self) private var localization

        let audiobooks: [Audiobook]

        var body: some View {
            if audiobooks.isEmpty {
                EmptyView()
            } else {
                sectionContent
            }
        }

        private var sectionContent: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                sectionHeader
                audiobooksScrollRow
            }
        }

        private var sectionHeader: some View {
            HStack {
                Text(localization.t("listen.discoverAudiobooks"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Button {
                    coordinator.fullscreenRoute = .audiobookBrowse
                } label: {
                    Text(localization.t("listen.browseAll"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .padding(.horizontal, TVDesignTokens.Spacing.lg)
                        .padding(.vertical, TVDesignTokens.Spacing.md)
                        .background(DesignTokens.Glass.bg)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                }
                .tvCardStyle()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }

        private var audiobooksScrollRow: some View {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(audiobooks.prefix(10)) { audiobook in
                        GlassFocusPoster(
                            thumbnailURL: audiobook.thumbnail,
                            title: audiobook.title ?? localization.t("audiobooks.audiobook"),
                            subtitle: audiobook.author,
                            badge: audiobook.duration,
                            aspectRatio: 2 / 3,
                            onSelect: {
                                coordinator.presentPlayer(
                                    contentId: audiobook.id,
                                    contentType: .audiobook
                                )
                            }
                        )
                        .contextMenu {
                            Button {
                                coordinator.fullscreenRoute = .audiobookDetail(audiobookId: audiobook.id)
                            } label: {
                                Label(localization.t("audiobooks.chapters"), systemImage: "list.bullet")
                            }
                        }
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
        }
    }
#endif
