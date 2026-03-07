#if os(tvOS)

    import BayitBYOC
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Fullscreen grid view for browsing all items from a BYOC source.
    struct TVBYOCBrowseGrid<CardContent: View>: View {
        @Environment(LocalizationManager.self) private var localization

        let title: String
        let icon: String
        let items: [BYOCContentItem]
        let onDismiss: () -> Void
        let cardBuilder: (BYOCContentItem) -> CardContent

        private let columns = [
            GridItem(.adaptive(minimum: 340, maximum: 400), spacing: TVDesignTokens.Spacing.lg),
        ]

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                    header
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.xl) {
                            ForEach(items, id: \.id) { item in
                                cardBuilder(item)
                            }
                        }
                        .padding(.horizontal, TVDesignTokens.Spacing.xl)
                        .padding(.bottom, TVDesignTokens.Spacing.xxl)
                    }
                }
            }
            .onExitCommand { onDismiss() }
        }

        private var header: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.default)

                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Text("\(items.count) \(localization.t("byoc.itemsLoaded"))")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Button { onDismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 36))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                .tvCardStyle()
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.top, TVDesignTokens.Spacing.lg)
        }
    }

#endif
