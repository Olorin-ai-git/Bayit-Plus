#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    extension TVMainTabView {
        func handleProactiveSuggestion(_ suggestion: ProactiveSuggestion) {
            guard let contentId = suggestion.action?.payload?["contentId"],
                  let contentType = suggestion.action?.payload?["contentType"]
            else { return }
            coordinator.presentPlayer(
                contentId: contentId,
                contentType: TVContentTypeMapper.map(contentType)
            )
        }

        var languagePickerSheet: some View {
            VStack(spacing: 0) {
                HStack {
                    Spacer()
                    Button {
                        showLanguagePicker = false
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: TVDesignTokens.FontSize.xl))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    .tvCardStyle()
                    .accessibilityLabel(localization.t("common.dismiss"))
                }
                .padding(.top, TVDesignTokens.Spacing.md)
                .padding(.trailing, TVDesignTokens.Spacing.xl)

                TVLanguageSettingsView()
            }
            .background(DesignTokens.Background.primary)
            .onExitCommand { showLanguagePicker = false }
        }
    }
#endif
