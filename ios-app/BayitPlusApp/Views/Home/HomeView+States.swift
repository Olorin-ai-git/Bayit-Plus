import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension on HomeView providing youngsters section, loading, and error states.
extension HomeView {
    // MARK: - Youngsters Section

    func youngstersSection(_ vm: HomeViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                Text(localization.t("youngsters.title"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                Spacer()
                Button {
                    coordinator.navigate(to: .youngsters)
                } label: {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Text(localization.t("common.showAll"))
                            .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                            .foregroundStyle(DesignTokens.Primary.p400)
                        Image(systemName: "chevron.right")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Primary.p400)
                    }
                }
                .accessibilityLabel("Show all Youngsters content")
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            GlassCarousel(items: vm.youngstersTrending, itemWidth: 160) { item in
                GlassContentCard(
                    thumbnailURL: item.thumbnail,
                    title: item.title,
                    subtitle: item.duration,
                    aspectRatio: 2.0 / 3.0,
                    width: 160,
                    onTap: {
                        coordinator.presentFullscreen(.player(
                            contentId: item.id,
                            contentType: .movie
                        ))
                    }
                )
            }
        }
    }

    // MARK: - Loading State

    var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ForEach(0 ..< 3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 180)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .accessibilityHidden(true)
            }
        }
        .padding(.top, DesignTokens.Spacing.xl)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Loading content")
    }

    // MARK: - Error State

    func errorState(_ message: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Warning.default)
                .accessibilityHidden(true)

            Text(message)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.xl)

            GlassButton(localization.t("common.retry"), variant: .secondary, size: .medium) {
                Task { await viewModel?.refresh() }
            }
            .accessibilityHint("Double tap to reload content")
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 100)
        .accessibilityElement(children: .combine)
    }
}
