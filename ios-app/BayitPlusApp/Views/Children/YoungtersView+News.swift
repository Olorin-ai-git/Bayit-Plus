import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension providing news section and loading state for YoungtersView.
extension YoungtersView {
    func newsSection(_ vm: YoungstersViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("youngsters.news"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            LazyVStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(vm.news) { item in
                    newsRow(item)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    func newsRow(_ item: NewsItem) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                if let thumb = item.thumbnail, let url = URL(string: thumb) {
                    CachedAsyncImage(url: url) { phase in
                        if case let .success(image) = phase {
                            image.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            DesignTokens.Glass.bg
                        }
                    }
                    .frame(width: 60, height: 60)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                }

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(item.title ?? "")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let source = item.source {
                        Text(source)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                }

                Spacer()
            }
            .padding(DesignTokens.Spacing.md)
        }
    }
}
