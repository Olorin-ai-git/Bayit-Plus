import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension on MorningRitualView providing ritual item rows and loading state.
extension MorningRitualView {
    func ritualItemsList(_ vm: MorningRitualViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("ritual.todayContent"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            ForEach(vm.ritualContent) { item in
                ritualItemRow(item)
            }
        }
    }

    func ritualItemRow(_ item: RitualItem) -> some View {
        GlassCard {
            Button {
                if let contentId = item.contentId {
                    coordinator.presentFullscreen(
                        .player(contentId: contentId, contentType: .movie)
                    )
                }
            } label: {
                HStack(spacing: DesignTokens.Spacing.md) {
                    ZStack {
                        if let thumb = item.thumbnail, let url = URL(string: thumb) {
                            CachedAsyncImage(url: url) { phase in
                                if case let .success(image) = phase {
                                    image.resizable().aspectRatio(contentMode: .fill)
                                } else {
                                    DesignTokens.Glass.bg
                                }
                            }
                        } else {
                            DesignTokens.Glass.bg
                        }
                    }
                    .frame(width: 60, height: 60)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        Text(item.title ?? "")
                            .font(.system(
                                size: DesignTokens.FontSize.md,
                                weight: .medium
                            ))
                            .foregroundColor(DesignTokens.Text.primary)
                            .lineLimit(1)

                        if let type = item.type {
                            Text(type.capitalized)
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundColor(DesignTokens.Text.secondary)
                        }
                    }

                    Spacer()

                    if item.isCompleted == true {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(DesignTokens.Success.default)
                    } else {
                        Image(systemName: "play.circle.fill")
                            .foregroundColor(DesignTokens.Primary.default)
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
    }

    var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .fill(DesignTokens.Glass.bg)
                .frame(height: 100)

            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .fill(DesignTokens.Glass.bg)
                .frame(height: 120)

            ForEach(0 ..< 3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 80)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}
