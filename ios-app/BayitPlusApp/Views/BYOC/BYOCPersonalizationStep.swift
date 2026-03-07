import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Step 4: Language priority and category selection for home screen.
struct BYOCPersonalizationStep: View {
    @Environment(LocalizationManager.self) private var localization

    let plan: NormalizationPlan?
    let onComplete: () -> Void

    @State private var enabledCategories: Set<String> = []
    @State private var languagePriority: [String] = []

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Text(localization.t("byoc.onboarding.personalizeTitle"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("byoc.onboarding.personalizeDesc"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            if let plan {
                ScrollView {
                    VStack(
                        alignment: .leading,
                        spacing: DesignTokens.Spacing.lg
                    ) {
                        if plan.detectedLanguages.count > 1 {
                            languageSection(plan.detectedLanguages)
                        }
                        categorySection(plan.suggestedCategories)
                    }
                    .padding(.horizontal)
                }
            }

            Spacer()

            Button {
                onComplete()
            } label: {
                HStack {
                    Spacer()
                    Text(localization.t("byoc.onboarding.ready"))
                    Spacer()
                }
                .padding()
                .background(DesignTokens.Primary.default)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.xl)
        }
        .onAppear {
            if let plan {
                enabledCategories = Set(plan.suggestedCategories.prefix(5))
                languagePriority = plan.detectedLanguages
            }
        }
    }

    private func languageSection(_ languages: [String]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("byoc.onboarding.languagePriority"))
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            ForEach(languages, id: \.self) { lang in
                HStack {
                    Text(languageDisplayName(lang))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Spacer()
                    Image(systemName: "line.3.horizontal")
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
                .padding(DesignTokens.Spacing.sm)
                .background(DesignTokens.Background.elevated)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    private func categorySection(_ categories: [String]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("byoc.onboarding.homeCategories"))
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            ForEach(categories, id: \.self) { category in
                Toggle(isOn: Binding(
                    get: { enabledCategories.contains(category) },
                    set: { enabled in
                        if enabled {
                            enabledCategories.insert(category)
                        } else {
                            enabledCategories.remove(category)
                        }
                    }
                )) {
                    Text(category.capitalized)
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
                .tint(DesignTokens.Primary.default)
                .padding(.vertical, 4)
            }
        }
    }

    private func languageDisplayName(_ code: String) -> String {
        Locale.current.localizedString(forLanguageCode: code) ?? code
    }
}
