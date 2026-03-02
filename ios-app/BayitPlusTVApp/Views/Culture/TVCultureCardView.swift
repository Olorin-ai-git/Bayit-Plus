#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS culture content thumbnail card with focus support.
    /// Displays a culture item with image, title, and source overlay.
    struct TVCultureCardView: View {
        let item: CultureItem
        let onTap: () -> Void

        var body: some View {
            Button(action: onTap) {
                ZStack(alignment: .bottom) {
                    thumbnail

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                        if let title = item.title {
                            Text(title)
                                .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .lineLimit(2)
                        }

                        if let source = item.sourceName {
                            Text(source)
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.secondary)
                                .lineLimit(1)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(TVDesignTokens.Spacing.md)
                    .background(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                .black.opacity(0),
                                .black.opacity(0.8),
                            ]),
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                }
                .frame(width: TVDesignTokens.MinSize.posterWidth, height: 200)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
            }
            .tvCardStyle()
        }

        @ViewBuilder
        private var thumbnail: some View {
            if let imageUrl = item.imageUrl, let url = URL(string: imageUrl) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure, .empty:
                        fallbackImage
                    @unknown default:
                        fallbackImage
                    }
                }
            } else {
                fallbackImage
            }
        }

        private var fallbackImage: some View {
            ZStack {
                DesignTokens.Glass.bgStrong
                Image(systemName: "photo")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }
#endif
