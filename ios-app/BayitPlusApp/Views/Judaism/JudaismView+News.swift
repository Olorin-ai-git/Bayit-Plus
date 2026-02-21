import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension providing news section and loading state for JudaismView.
extension JudaismView {
    func newsSection(_ vm: JudaismViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("judaism.news"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            LazyVStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(vm.news) { item in
                    GlassCard {
                        HStack(spacing: DesignTokens.Spacing.md) {
                            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                                Text(item.title ?? "")
                                    .font(.system(
                                        size: DesignTokens.FontSize.sm,
                                        weight: .medium
                                    ))
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
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ForEach(0 ..< 3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 120)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}
