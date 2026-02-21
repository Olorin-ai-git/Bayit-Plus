#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS full-screen detail view for a single culture content item.
    /// Displays hero image, title, source, category, and full description.
    struct TVCultureContentView: View {
        let item: CultureItem
        let onDismiss: () -> Void

        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            ZStack(alignment: .topTrailing) {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: TVDesignTokens.Spacing.xl) {
                        heroImage
                        contentDetails
                    }
                    .padding(.bottom, TVDesignTokens.Spacing.xxxl)
                }

                closeButton
            }
            .background(DesignTokens.Background.primary)
        }

        @ViewBuilder
        private var heroImage: some View {
            if let imageUrl = item.imageUrl, let url = URL(string: imageUrl) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(16 / 9, contentMode: .fill)
                    case .failure, .empty:
                        heroFallback
                    @unknown default:
                        heroFallback
                    }
                }
                .frame(height: TVDesignTokens.MinSize.heroHeight)
                .clipped()
            } else {
                heroFallback
            }
        }

        private var heroFallback: some View {
            ZStack {
                DesignTokens.Glass.bg
                Image(systemName: "photo.fill")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(height: TVDesignTokens.MinSize.heroHeight)
        }

        private var contentDetails: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                if let title = item.title {
                    Text(title)
                        .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                }

                HStack(spacing: TVDesignTokens.Spacing.md) {
                    if let source = item.sourceName {
                        badgeView(text: source, color: DesignTokens.Primary.default)
                    }

                    if let category = item.category {
                        badgeView(text: category, color: DesignTokens.Secondary.default)
                    }
                }

                if let description = item.description {
                    Text(description)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineSpacing(8)
                        .padding(.top, TVDesignTokens.Spacing.md)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        }

        private func badgeView(text: String, color: Color) -> some View {
            Text(text)
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .medium))
                .foregroundStyle(color)
                .padding(.horizontal, TVDesignTokens.Spacing.md)
                .padding(.vertical, TVDesignTokens.Spacing.sm)
                .background(color.opacity(0.2))
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
        }

        private var closeButton: some View {
            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .frame(width: TVDesignTokens.MinSize.focusableWidth, height: TVDesignTokens.MinSize.focusableHeight)
                    .background(DesignTokens.Glass.bgStrong)
                    .clipShape(Circle())
            }
            .buttonStyle(.card)
            .tvFocusStyle()
            .padding([.top, .trailing], TVDesignTokens.Spacing.xxl)
        }
    }
#endif
