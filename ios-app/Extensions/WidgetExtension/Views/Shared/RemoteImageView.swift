import SwiftUI
import BayitDesignSystem

/// Async image loading for widget snapshots.
///
/// Displays an image from a remote URL with a fallback SF Symbol
/// shown while loading or if the URL is nil.
struct RemoteImageView: View {

    /// The remote image URL to load.
    let url: URL?

    /// The SF Symbol name shown as a placeholder when the image
    /// is loading or unavailable.
    let fallbackSymbol: String

    /// Corner radius applied to the loaded image.
    var cornerRadius: CGFloat = DesignTokens.Radius.sm

    var body: some View {
        if let url {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .clipShape(
                            RoundedRectangle(cornerRadius: cornerRadius)
                        )

                case .failure:
                    placeholderView

                case .empty:
                    placeholderView

                @unknown default:
                    placeholderView
                }
            }
        } else {
            placeholderView
        }
    }

    // MARK: - Private

    private var placeholderView: some View {
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(DesignTokens.Glass.bgMedium)

            Image(systemName: fallbackSymbol)
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }
}
