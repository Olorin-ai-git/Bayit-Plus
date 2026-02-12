import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct ZineArchiveSheet: View {
    @Environment(LocalizationManager.self) private var localization
    let archive: [WeeklyZine]
    let onDismiss: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(archive) { zine in
                        GlassCard {
                            HStack(spacing: DesignTokens.Spacing.md) {
                                Image(systemName: "book")
                                    .font(.system(size: 24))
                                    .foregroundStyle(DesignTokens.Primary.p400)

                                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                                    Text(zine.title)
                                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                                        .foregroundStyle(DesignTokens.Text.primary)

                                    Text(zine.weekStartDate)
                                        .font(.system(size: DesignTokens.FontSize.xs))
                                        .foregroundStyle(DesignTokens.Text.muted)
                                }

                                Spacer()

                                Text("\(zine.pages.count) pages")
                                    .font(.system(size: DesignTokens.FontSize.xs))
                                    .foregroundStyle(DesignTokens.Text.secondary)
                            }
                        }
                    }
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .background(DesignTokens.Background.primary)
            .navigationTitle(localization.t("zine.archive"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localization.t("common.close")) { onDismiss() }
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
        }
    }
}
