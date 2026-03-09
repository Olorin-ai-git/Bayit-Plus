import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Welcome step with full-screen background image, language grid, and skip.
struct TVOnboardingWelcomeStep: View {
    @Environment(LocalizationManager.self) private var localization

    let onNext: () -> Void
    let onSkip: () -> Void

    @State private var imageScale: CGFloat = 1.0

    private let languages = Language.allCases
    private let columns = [
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
    ]

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .bottom) {
                backgroundImage(size: geo.size)
                contentOverlay
            }
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(
                .easeInOut(duration: 30).repeatForever(autoreverses: true)
            ) {
                imageScale = 1.08
            }
        }
    }

    // MARK: - Background

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
                        .init(color: .clear, location: 0.25),
                        .init(color: .black.opacity(0.4), location: 0.40),
                        .init(color: .black.opacity(0.85), location: 0.55),
                        .init(color: .black, location: 0.65),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
    }

    // MARK: - Content

    private var contentOverlay: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("onboarding.welcome.title"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text(localization.t("onboarding.welcome.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(.white.opacity(0.65))
                .multilineTextAlignment(.center)

            languageGrid
                .padding(.top, TVDesignTokens.Spacing.sm)

            actionButtons
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
        .padding(.bottom, TVDesignTokens.Spacing.xxl)
    }

    // MARK: - Language Grid

    private var languageGrid: some View {
        LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.md) {
            ForEach(languages, id: \.rawValue) { language in
                languageButton(language)
            }
        }
    }

    private func languageButton(_ language: Language) -> some View {
        let isSelected = localization.currentLanguage == language

        return Button {
            localization.setLanguage(language)
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Text(Self.flag(for: language))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                Text(language.displayName)
                    .font(.system(
                        size: TVDesignTokens.FontSize.base,
                        weight: isSelected ? .bold : .medium
                    ))
                    .foregroundStyle(.white)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, minHeight: TVDesignTokens.MinSize.focusableHeight)
            .background(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .fill(
                        isSelected
                            ? DesignTokens.Primary.default
                            : Color.white.opacity(0.10)
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                    .strokeBorder(
                        isSelected
                            ? DesignTokens.Primary.p500
                            : Color.white.opacity(0.12),
                        lineWidth: isSelected ? 3 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .tvCardStyle()
    }

    // MARK: - Actions

    private var actionButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            GlassButton(
                localization.t("onboarding.welcome.continue"),
                variant: .primary,
                size: .large,
                icon: Image(systemName: "arrow.right")
            ) {
                onNext()
            }

            Button {
                onSkip()
            } label: {
                Text(localization.t("onboarding.skip"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Flags

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
