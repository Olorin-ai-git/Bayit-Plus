import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVYoungstersView + News & Shelves

extension TVYoungstersView {
    func trendingShelf(_ vm: YoungstersViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("youngsters.categories.trending"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            LazyVGrid(columns: contentColumns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(vm.trending) { item in
                    GlassFocusPoster(
                        thumbnailURL: item.thumbnail,
                        title: item.title ?? localization.t("youngsters.title"),
                        subtitle: item.duration,
                        badge: localization.t("youngsters.categories.trending"),
                        aspectRatio: 16 / 9,
                        onSelect: {
                            coordinator.presentPlayer(
                                contentId: item.id,
                                contentType: TVContentTypeMapper.map(item.type)
                            )
                        }
                    )
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    // MARK: - News

    func newsSection(_ vm: YoungstersViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("youngsters.categories.news"))
                .font(.system(
                    size: TVDesignTokens.FontSize.xl,
                    weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            LazyVStack(spacing: TVDesignTokens.Spacing.sm) {
                ForEach(vm.news.prefix(5)) { item in
                    newsCard(item)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    func newsCard(_ item: NewsItem) -> some View {
        Button {} label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(item.title ?? "")
                        .font(.system(
                            size: TVDesignTokens.FontSize.base,
                            weight: .medium
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let source = item.source {
                        Text(source)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }
                Spacer()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }

    // MARK: - Loading

    var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("youngsters.title"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
