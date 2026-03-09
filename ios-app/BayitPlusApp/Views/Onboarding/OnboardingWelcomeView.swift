import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct OnboardingWelcomeView: View {
    @Environment(LocalizationManager.self) var localization
    @Bindable var viewModel: OnboardingFlowViewModel
    let onContinue: () -> Void

    @State private var imageScale: CGFloat = 1.0

    var body: some View {
        ZStack {
            backgroundImage
            contentOverlay
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear {
            withAnimation(
                .easeInOut(duration: 20).repeatForever(autoreverses: true)
            ) {
                imageScale = 1.15
            }
        }
    }

    private var backgroundImage: some View {
        Image("onboarding_welcome")
            .resizable()
            .aspectRatio(contentMode: .fill)
            .scaleEffect(imageScale)
            .ignoresSafeArea()
            .overlay(
                LinearGradient(
                    colors: [
                        .clear,
                        DesignTokens.Background.primary.opacity(0.6),
                        DesignTokens.Background.primary,
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
    }

    private var contentOverlay: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()

            Text(localization.t("onboarding.welcome.title"))
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t("onboarding.welcome.subtitle"))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            languagePicker

            GlassButton(
                localization.t("onboarding.welcome.continue"),
                variant: .primary,
                size: .large
            ) {
                localization.setLanguage(viewModel.selectedLanguage)
                onContinue()
            }
            .padding(.top, DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.bottom, DesignTokens.Spacing.xxl)
    }

    private var languagePicker: some View {
        let columns = [
            GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
            GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
        ]
        return LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.sm) {
            ForEach(Language.allCases, id: \.rawValue) { language in
                let isSelected = viewModel.selectedLanguage == language
                Button {
                    HapticFeedbackService.selection()
                    viewModel.selectedLanguage = language
                } label: {
                    Text(language.displayName)
                        .font(.system(
                            size: DesignTokens.FontSize.sm,
                            weight: isSelected ? .semibold : .regular
                        ))
                        .foregroundStyle(
                            isSelected
                                ? DesignTokens.Text.primary
                                : DesignTokens.Text.secondary
                        )
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DesignTokens.Spacing.md)
                        .background(
                            isSelected
                                ? DesignTokens.Primary.default
                                : DesignTokens.Glass.bgMedium
                        )
                        .clipShape(
                            RoundedRectangle(
                                cornerRadius: DesignTokens.Radius.md
                            )
                        )
                        .overlay(
                            RoundedRectangle(
                                cornerRadius: DesignTokens.Radius.md
                            )
                            .stroke(
                                isSelected
                                    ? DesignTokens.Primary.p500
                                    : DesignTokens.Glass.border,
                                lineWidth: 1
                            )
                        )
                }
            }
        }
    }
}
