#if os(tvOS)

    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Row builder helpers for TVBYOCSourceListView

    extension TVBYOCSourceListView {
        func addSourceRow(
            icon: String,
            title: String,
            subtitle: String,
            color: Color,
            action: @escaping () -> Void
        ) -> some View {
            Button(action: action) {
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    Image(systemName: icon)
                        .font(.system(size: 32))
                        .foregroundStyle(color)
                        .frame(width: 50)
                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                        Text(title)
                            .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                        Text(subtitle)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                    Spacer()
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 30))
                        .foregroundStyle(color)
                }
                .padding(TVDesignTokens.Spacing.lg)
                .background(DesignTokens.Background.elevated)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()
        }

        func connectedRow(
            icon: String,
            title: String,
            subtitle: String,
            color: Color
        ) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundStyle(color)
                    .frame(width: 50)
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                    Text(title)
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text(subtitle)
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                Spacer()
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(.green)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Background.elevated)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }

        var closeButton: some View {
            Button { onDismiss() } label: {
                Text(localization.t("common.close"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(TVDesignTokens.Spacing.lg)
                    .frame(maxWidth: .infinity)
                    .background(DesignTokens.Glass.purpleLight)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
            }
            .tvCardStyle()
        }
    }

#endif
