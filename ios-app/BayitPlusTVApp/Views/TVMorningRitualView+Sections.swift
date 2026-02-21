import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - AI Brief

extension TVMorningRitualView {
    func aiBriefSection(_ brief: RitualAIBriefResponse) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "sparkles")
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Primary.default)

                Text(localization.t("ritual.aiBrief"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg,
                        weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            if let briefText = brief.brief {
                Text(briefText)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }

            if let topics = brief.topics, !topics.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: TVDesignTokens.Spacing.sm) {
                        ForEach(topics, id: \.self) { topic in
                            GlassChip(title: topic, isSelected: false) {}
                        }
                    }
                }
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    func aiBriefLoadButton(_ vm: MorningRitualViewModel) -> some View {
        GlassButton(
            localization.t("ritual.loadBrief"),
            variant: .secondary,
            size: .large
        ) {
            Task { await vm.loadAIBrief() }
        }
        .frame(maxWidth: 400)
    }
}

// MARK: - Ritual Items

extension TVMorningRitualView {
    func ritualItemsList(_ vm: MorningRitualViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("ritual.todayContent"))
                .font(.system(
                    size: TVDesignTokens.FontSize.xl,
                    weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)

            LazyVStack(spacing: TVDesignTokens.Spacing.sm) {
                ForEach(vm.ritualContent) { item in
                    ritualItemRow(item)
                }
            }
        }
    }

    func ritualItemRow(_ item: RitualItem) -> some View {
        Button {
            if let contentId = item.contentId {
                coordinator.presentPlayer(
                    contentId: contentId,
                    contentType: .vod
                )
            }
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
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
                .frame(width: 120, height: 120)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(item.title ?? "")
                        .font(.system(
                            size: TVDesignTokens.FontSize.lg,
                            weight: .medium
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let type = item.type {
                        Text(type.capitalized)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }

                Spacer()

                if item.isCompleted == true {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.xxl))
                        .foregroundStyle(DesignTokens.Success.default)
                } else {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.xxl))
                        .foregroundStyle(DesignTokens.Primary.default)
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity, minHeight: 150, alignment: .leading)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }
}
