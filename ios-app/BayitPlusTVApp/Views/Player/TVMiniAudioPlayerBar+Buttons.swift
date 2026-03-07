#if os(tvOS)
    import BayitDesignSystem
    import BayitMedia
    import SwiftUI

    // MARK: - TVMiniAudioPlayerBar + Control Buttons

    extension TVMiniAudioPlayerBar {
        var skipBackButton: some View {
            Button {
                sessionCoordinator.skipBackward()
            } label: {
                Image(systemName: "gobackward.15")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .frame(
                        width: TVDesignTokens.MinSize.focusableWidth,
                        height: TVDesignTokens.MinSize.focusableHeight
                    )
            }
            .tvCardStyle()
            .accessibilityLabel("Skip back 15 seconds")
        }

        var skipForwardButton: some View {
            Button {
                sessionCoordinator.skipForward()
            } label: {
                Image(systemName: "goforward.30")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .frame(
                        width: TVDesignTokens.MinSize.focusableWidth,
                        height: TVDesignTokens.MinSize.focusableHeight
                    )
            }
            .tvCardStyle()
            .accessibilityLabel("Skip forward 30 seconds")
        }

        var artworkThumbnail: some View {
            Group {
                if let url = audioManager.artworkURL {
                    CachedAsyncImage(url: url) { phase in
                        switch phase {
                        case let .success(image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        case .failure, .empty:
                            artworkPlaceholder
                        @unknown default:
                            artworkPlaceholder
                        }
                    }
                } else {
                    artworkPlaceholder
                }
            }
        }

        var artworkPlaceholder: some View {
            ZStack {
                DesignTokens.Glass.bgMedium
                Image(systemName: audioManager.activeContentType == .radio ? "radio" : "headphones")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }
#endif
