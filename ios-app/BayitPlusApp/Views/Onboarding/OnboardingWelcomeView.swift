import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct OnboardingWelcomeView: View {
    @Environment(LocalizationManager.self) var localization
    @Bindable var viewModel: OnboardingFlowViewModel
    let onContinue: () -> Void

    @State private var imageScale: CGFloat = 1.0

    private let languages = Language.allCases
    private let columns = [
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10),
    ]

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottom) {
                backgroundImage(size: geo.size)
                contentPanel
            }
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(
                .easeInOut(duration: 20).repeatForever(autoreverses: true)
            ) {
                imageScale = 1.15
            }
        }
    }

    private func backgroundImage(size: CGSize) -> some View {
        Image("onboarding_welcome")
            .resizable()
            .aspectRatio(contentMode: .fill)
            .scaleEffect(imageScale)
            .frame(width: size.width, height: size.height)
            .clipped()
            .overlay(
                LinearGradient(
                    stops: [
                        .init(color: .clear, location: 0.0),
                        .init(color: .clear, location: 0.35),
                        .init(color: .black.opacity(0.25), location: 0.44),
                        .init(color: .black.opacity(0.65), location: 0.52),
                        .init(color: .black.opacity(0.90), location: 0.60),
                        .init(color: .black, location: 0.68),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
    }

    private var contentPanel: some View {
        VStack(spacing: 12) {
            Text(localization.t("onboarding.welcome.title"))
                .font(.system(size: 32, weight: .bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text(localization.t("onboarding.welcome.subtitle"))
                .font(.system(size: 17))
                .foregroundStyle(.white.opacity(0.65))
                .multilineTextAlignment(.center)
                .padding(.bottom, 4)

            languageGrid

            GlassButton(
                localization.t("onboarding.welcome.continue"),
                variant: .primary,
                size: .large
            ) {
                localization.setLanguage(viewModel.selectedLanguage)
                onContinue()
            }
            .padding(.top, 6)
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 50)
    }

    private var languageGrid: some View {
        LazyVGrid(columns: columns, spacing: 10) {
            ForEach(languages, id: \.rawValue) { language in
                languageButton(language)
            }
        }
    }

    @ViewBuilder
    private func languageButton(_ language: Language) -> some View {
        let isSelected = viewModel.selectedLanguage == language
        let flag = Self.flag(for: language)
        let name = language.displayName

        Button {
            HapticFeedbackService.selection()
            viewModel.selectedLanguage = language
            localization.setLanguage(language)
        } label: {
            HStack(spacing: 8) {
                Text(flag)
                    .font(.system(size: 20))
                Text(name)
                    .font(.system(size: 15, weight: isSelected ? .bold : .medium))
                    .foregroundStyle(.white)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, minHeight: 44)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(
                        isSelected
                            ? DesignTokens.Primary.default
                            : Color.white.opacity(0.10)
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(
                        isSelected
                            ? DesignTokens.Primary.p500
                            : Color.white.opacity(0.12),
                        lineWidth: 1
                    )
            )
        }
        .buttonStyle(.plain)
    }

    private static func flag(for language: Language) -> String {
        switch language {
        case .english: return "\u{1F1FA}\u{1F1F8}"
        case .hebrew: return "\u{1F1EE}\u{1F1F1}"
        case .spanish: return "\u{1F1EA}\u{1F1F8}"
        case .french: return "\u{1F1EB}\u{1F1F7}"
        case .chinese: return "\u{1F1E8}\u{1F1F3}"
        case .italian: return "\u{1F1EE}\u{1F1F9}"
        case .hindi: return "\u{1F1EE}\u{1F1F3}"
        case .tamil: return "\u{1F1EE}\u{1F1F3}"
        case .bengali: return "\u{1F1E7}\u{1F1E9}"
        case .japanese: return "\u{1F1EF}\u{1F1F5}"
        }
    }
}
