import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Card displaying a system widget with icon, content badge, and add/remove action
struct SystemWidgetCardView: View {
    @Environment(LocalizationManager.self) private var localization
    let widget: AvailableSystemWidget
    let isDockVisible: Bool
    let isActionLoading: Bool
    let onAdd: () -> Void
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            contentIcon
            contentInfo
            Spacer(minLength: 0)
            actionButton
        }
        .padding(DesignTokens.Spacing.md)
        .glassCard()
    }

    // MARK: - Icon Circle

    private var contentIcon: some View {
        Group {
            // Try coverUrl first (backend resolved poster), then icon, then placeholder
            if let posterUrl = widget.coverUrl ?? widget.icon, let url = URL(string: posterUrl) {
                // Show actual poster image
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        placeholderIcon
                    case let .success(image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 56, height: 56)
                            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                    case .failure:
                        placeholderIcon
                    @unknown default:
                        placeholderIcon
                    }
                }
            } else {
                // Fall back to generic icon
                placeholderIcon
            }
        }
    }

    private var placeholderIcon: some View {
        ZStack {
            Circle()
                .fill(iconColor.opacity(0.15))
                .frame(width: 56, height: 56)

            Image(systemName: iconName)
                .font(.system(size: 20))
                .foregroundColor(iconColor)
        }
    }

    private var iconName: String {
        widget.content?.contentType?.iconName ?? "square.grid.2x2"
    }

    private var iconColor: Color {
        guard let contentType = widget.content?.contentType else {
            return DesignTokens.Primary.default
        }
        switch contentType {
        case .liveChannel, .live:
            return DesignTokens.Primary.default
        case .podcast:
            return DesignTokens.Success.default
        case .radio:
            return DesignTokens.Warning.default
        case .vod, .audiobook:
            return DesignTokens.Info.default
        case .iframe:
            return DesignTokens.Secondary.default
        case .custom:
            return DesignTokens.Primary.default
        }
    }

    // MARK: - Content Info

    private var contentInfo: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(widget.title)
                .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                .foregroundColor(DesignTokens.Text.primary)
                .lineLimit(1)

            if let description = widget.description {
                Text(description)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.muted)
                    .lineLimit(2)
            }

            if let contentType = widget.content?.contentType {
                contentTypeBadge(contentType)
            }
        }
    }

    private func contentTypeBadge(_ contentType: WidgetContentType) -> some View {
        let variant: GlassBadge.Variant = switch contentType {
        case .liveChannel, .live: .primary
        case .podcast: .success
        case .radio: .warning
        case .vod, .audiobook: .info
        case .iframe, .custom: .primary
        }
        return GlassBadge(text: contentType.displayLabel, variant: variant)
    }

    // MARK: - Action Button

    @ViewBuilder
    private var actionButton: some View {
        if widget.isAdded && isDockVisible {
            GlassButton(
                localization.t("widgets.added"),
                variant: .secondary,
                size: .small,
                isLoading: isActionLoading,
                icon: Image(systemName: "checkmark")
            ) {
                HapticFeedbackService.impact(style: .light)
                onRemove()
            }
            .frame(width: 90)
        } else if widget.isAdded && !isDockVisible {
            GlassButton(
                localization.t("widgets.show"),
                variant: .secondary,
                size: .small,
                isLoading: isActionLoading,
                icon: Image(systemName: "eye")
            ) {
                HapticFeedbackService.impact(style: .light)
                onRemove()
            }
            .frame(width: 90)
        } else {
            GlassButton(
                localization.t("widgets.add"),
                variant: .primary,
                size: .small,
                isLoading: isActionLoading,
                icon: Image(systemName: "plus")
            ) {
                HapticFeedbackService.impact(style: .light)
                onAdd()
            }
            .frame(width: 90)
        }
    }
}
