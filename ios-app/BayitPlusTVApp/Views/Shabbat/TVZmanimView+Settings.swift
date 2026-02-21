import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVZmanimView + Settings & Content Sections

extension TVZmanimView {
    // MARK: - Settings

    func settingsSection(_ vm: ShabbatViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            sectionHeader(localization.t("shabbat.settings"))

            VStack(spacing: TVDesignTokens.Spacing.lg) {
                // Auto-mode toggle in its own focus section
                VStack(spacing: TVDesignTokens.Spacing.xs) {
                    HStack {
                        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                            Text(localization.t("shabbat.autoMode"))
                                .font(.system(size: TVDesignTokens.FontSize.lg))
                                .foregroundStyle(DesignTokens.Text.primary)

                            Text(localization.t("shabbat.autoModeDescription"))
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }

                        Spacer()

                        Toggle(
                            "",
                            isOn: Bindable(vm).autoModeEnabled
                        )
                        .tint(DesignTokens.Primary.default)
                        .labelsHidden()
                    }
                }
                .focusSection()

                divider

                // Manual toggle in its own focus section
                HStack {
                    Text(localization.t("shabbat.manualToggle"))
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()

                    GlassButton(
                        vm.isShabbatActive
                            ? localization.t("shabbat.deactivate")
                            : localization.t("shabbat.activate"),
                        variant: vm.isShabbatActive ? .destructive : .primary,
                        size: .large
                    ) {
                        vm.toggleShabbatMode()
                    }
                }
                .focusSection()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }

    // MARK: - Content Shelf

    func contentSection(_ vm: ShabbatViewModel) -> some View {
        GlassContentShelf(
            title: localization.t("shabbat.recommendedContent"),
            items: vm.shabbatContent
        ) { item in
            GlassFocusPoster(
                thumbnailURL: item.thumbnail,
                title: item.title ?? "",
                subtitle: item.category,
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

    // MARK: - Helpers

    func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }

    var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("common.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    var divider: some View {
        Rectangle()
            .fill(DesignTokens.Glass.border)
            .frame(height: 1)
    }
}
