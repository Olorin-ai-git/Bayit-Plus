import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Compact language picker sheet shown on the tvOS sign-in screen.
/// Presents all supported languages in a 5-column grid so users can
/// switch the app language before authenticating.
struct TVSignInLanguagePickerSheet: View {
    @Environment(LocalizationManager.self) private var localization

    let onDismiss: () -> Void

    private let columns = Array(
        repeating: GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        count: 5
    )

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: TVDesignTokens.Spacing.xxl) {
                headerSection

                languageGrid

                dismissButton
            }
            .padding(TVDesignTokens.Spacing.xxxxl)
        }
        .onExitCommand { onDismiss() }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: "globe")
                .font(.system(size: TVDesignTokens.FontSize.display))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("settings.chooseLanguage"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Grid

    private var languageGrid: some View {
        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(Language.allCases, id: \.rawValue) { language in
                languageCard(language)
            }
        }
    }

    private func languageCard(_ language: Language) -> some View {
        let isSelected = localization.currentLanguage == language

        return Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                localization.setLanguage(language)
            }
            onDismiss()
        } label: {
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                Text(language.displayName)
                    .font(.system(
                        size: TVDesignTokens.FontSize.md,
                        weight: isSelected ? .bold : .medium
                    ))
                    .foregroundStyle(
                        isSelected
                            ? DesignTokens.Text.primary
                            : DesignTokens.Text.secondary
                    )

                Text(language.rawValue.uppercased())
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .background(
                isSelected
                    ? DesignTokens.Primary.default.opacity(0.15)
                    : DesignTokens.Glass.bgLight
            )
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(
                        isSelected
                            ? DesignTokens.Primary.default
                            : DesignTokens.Glass.border,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.card)
    }

    // MARK: - Dismiss

    private var dismissButton: some View {
        GlassButton(
            localization.t("common.done"),
            variant: .secondary,
            size: .medium
        ) {
            onDismiss()
        }
    }
}
