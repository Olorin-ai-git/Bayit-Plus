import BayitDesignSystem
import SwiftUI

// MARK: - PiPWidgetContainerView Cover Image Helpers

extension PiPWidgetContainerView {
    func coverImage(fallbackIcon: String) -> some View {
        GeometryReader { geo in
            Group {
                if let url = playerVM?.resolvedCoverURL {
                    CachedAsyncImage(url: url) { phase in
                        switch phase {
                        case let .success(image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(maxWidth: geo.size.width, maxHeight: geo.size.height)
                                .frame(width: geo.size.width, height: geo.size.height)
                                .background(DesignTokens.Background.elevated)
                        default:
                            coverFallback(icon: fallbackIcon, size: 32)
                        }
                    }
                } else {
                    coverFallback(icon: fallbackIcon, size: 32)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height)
            .clipped()
        }
    }

    func coverThumbnail(fallbackIcon: String, fallbackColor: Color) -> some View {
        Group {
            if let url = playerVM?.resolvedCoverURL {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 56, height: 56)
                            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.default))
                    default:
                        thumbnailFallback(icon: fallbackIcon, color: fallbackColor)
                    }
                }
            } else {
                thumbnailFallback(icon: fallbackIcon, color: fallbackColor)
            }
        }
        .frame(width: 56, height: 56)
    }

    func coverFallback(icon: String, size: CGFloat) -> some View {
        ZStack {
            Color.black
            Image(systemName: icon)
                .font(.system(size: size))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    func thumbnailFallback(icon: String, color: Color) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.default)
                .fill(Color.white.opacity(0.1))
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundStyle(color)
        }
    }
}
