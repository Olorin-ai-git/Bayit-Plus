import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Multi-step AI-powered onboarding flow with animated transitions,
/// progress indicator, and four distinct setup steps.
struct OnboardingAIView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @Environment(NavigationCoordinator.self) private var coordinator
    @State private var viewModel: OnboardingAIViewModel?

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            if let vm = viewModel {
                VStack(spacing: 0) {
                    progressIndicator(vm)
                    stepContent(vm)
                    navigationButtons(vm)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .task {
            if viewModel == nil {
                viewModel = OnboardingAIViewModel(userRepository: repos.user)
            }
        }
    }

    // MARK: - Progress Indicator

    private func progressIndicator(_ vm: OnboardingAIViewModel) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(OnboardingAIViewModel.Step.allCases, id: \.rawValue) { step in
                Capsule()
                    .fill(
                        step.rawValue <= vm.currentStepIndex
                            ? DesignTokens.Primary.default
                            : DesignTokens.Glass.bgMedium
                    )
                    .frame(height: DesignTokens.Spacing.xs)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.top, DesignTokens.Spacing.lg)
        .padding(.bottom, DesignTokens.Spacing.md)
        .animation(.easeInOut(duration: 0.3), value: vm.currentStepIndex)
    }

    // MARK: - Step Content

    @ViewBuilder
    private func stepContent(_ vm: OnboardingAIViewModel) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: DesignTokens.Spacing.lg) {
                switch vm.currentStep {
                case .welcome:
                    welcomeStep(vm)
                case .contentTaste:
                    contentTasteStep(vm)
                case .voiceSetup:
                    voiceSetupStep(vm)
                case .profileCreation:
                    profileCreationStep(vm)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.xl)
        }
        .frame(maxHeight: .infinity)
    }

    // MARK: - Step 1: Welcome

    private func welcomeStep(_ vm: OnboardingAIViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "sparkles")
                .font(.system(size: DesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("onboarding.welcomeTitle"))
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t("onboarding.welcomeSubtitle"))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassCard {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    preferenceRow(
                        icon: "globe",
                        title: localization.t("onboarding.language"),
                        value: vm.preferredLanguage
                    )

                    togglePreference(
                        icon: "captions.bubble",
                        title: localization.t("onboarding.subtitles"),
                        isOn: vm.subtitlesEnabled
                    ) { vm.subtitlesEnabled = $0 }

                    togglePreference(
                        icon: "play.circle",
                        title: localization.t("onboarding.autoplay"),
                        isOn: vm.autoplayEnabled
                    ) { vm.autoplayEnabled = $0 }
                }
            }
        }
    }

    // MARK: - Step 2: Content Taste

    private func contentTasteStep(_ vm: OnboardingAIViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "sparkle.magnifyingglass")
                .font(.system(size: 36))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("onboarding.tasteTitle"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t("onboarding.tasteSubtitle"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            genreGrid(vm)
        }
    }

    private func genreGrid(_ vm: OnboardingAIViewModel) -> some View {
        let genres = [
            "drama", "comedy", "documentary", "action",
            "family", "thriller", "romance", "animation",
            "music", "reality", "news", "sports"
        ]
        let columns = [
            GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
            GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
            GridItem(.flexible(), spacing: DesignTokens.Spacing.sm)
        ]

        return LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.sm) {
            ForEach(genres, id: \.self) { genre in
                let isSelected = vm.selectedGenres.contains(genre)
                Button {
                    HapticFeedbackService.selection()
                    vm.toggleGenre(genre)
                } label: {
                    Text(genre.capitalized)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
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
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
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

    // MARK: - Step 3: Voice Setup

    private func voiceSetupStep(_ vm: OnboardingAIViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "waveform.circle.fill")
                .font(.system(size: DesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("onboarding.voiceTitle"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(localization.t("onboarding.voiceSubtitle"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
                    togglePreference(
                        icon: "mic.fill",
                        title: localization.t("onboarding.enableVoice"),
                        isOn: vm.voiceEnabled
                    ) { vm.voiceEnabled = $0 }

                    togglePreference(
                        icon: "text.bubble.fill",
                        title: localization.t("onboarding.wakeWord"),
                        isOn: vm.wakeWordEnabled
                    ) { vm.wakeWordEnabled = $0 }
                }
            }
        }
    }

    // MARK: - Step 4: Profile Creation

    private func profileCreationStep(_ vm: OnboardingAIViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: DesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("onboarding.profileTitle"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            GlassCard {
                VStack(spacing: DesignTokens.Spacing.md) {
                    GlassTextField(
                        localization.t("onboarding.namePlaceholder"),
                        text: Binding(
                            get: { vm.displayName },
                            set: { vm.displayName = $0 }
                        ),
                        icon: Image(systemName: "person")
                    )

                    avatarPicker(vm)
                }
            }
        }
    }

    private func avatarPicker(_ vm: OnboardingAIViewModel) -> some View {
        let avatarIcons = [
            "person.circle.fill", "star.circle.fill",
            "heart.circle.fill", "moon.circle.fill",
            "sun.max.circle.fill", "leaf.circle.fill"
        ]

        return VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("onboarding.chooseAvatar"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)

            HStack(spacing: DesignTokens.Spacing.md) {
                ForEach(avatarIcons, id: \.self) { icon in
                    let isSelected = vm.selectedAvatar == icon
                    Button {
                        HapticFeedbackService.selection()
                        vm.selectedAvatar = icon
                    } label: {
                        Image(systemName: icon)
                            .font(.system(size: 32))
                            .foregroundStyle(
                                isSelected
                                    ? DesignTokens.Primary.p400
                                    : DesignTokens.Text.muted
                            )
                            .padding(DesignTokens.Spacing.sm)
                            .background(
                                isSelected
                                    ? DesignTokens.Glass.purpleLight
                                    : Color.clear
                            )
                            .clipShape(Circle())
                    }
                }
            }
        }
    }

    // MARK: - Navigation Buttons

    private func navigationButtons(_ vm: OnboardingAIViewModel) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            if vm.currentStep != .welcome {
                GlassButton(
                    localization.t("onboarding.back"),
                    variant: .ghost,
                    size: .medium
                ) {
                    HapticFeedbackService.selection()
                    withAnimation(.easeInOut(duration: 0.3)) {
                        vm.previousStep()
                    }
                }
            }

            Spacer()

            if vm.currentStep == .profileCreation {
                GlassButton(
                    localization.t("onboarding.finish"),
                    variant: .primary,
                    size: .medium,
                    isDisabled: !vm.canProceed
                ) {
                    HapticFeedbackService.notification(type: .success)
                    Task {
                        await vm.completeOnboarding()
                        if vm.isComplete {
                            coordinator.pop()
                        }
                    }
                }
            } else {
                GlassButton(
                    localization.t("onboarding.next"),
                    variant: .primary,
                    size: .medium,
                    isDisabled: !vm.canProceed
                ) {
                    HapticFeedbackService.selection()
                    withAnimation(.easeInOut(duration: 0.3)) {
                        vm.nextStep()
                    }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xl)
        .padding(.vertical, DesignTokens.Spacing.lg)
    }

    // MARK: - Shared Components

    private func preferenceRow(
        icon: String, title: String, value: String
    ) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.default)
                .frame(width: 32)

            Text(title)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Text(value)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    private func togglePreference(
        icon: String,
        title: String,
        isOn: Bool,
        onChange: @escaping (Bool) -> Void
    ) -> some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.default)
                .frame(width: 32)

            Text(title)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Toggle("", isOn: Binding(
                get: { isOn },
                set: { onChange($0) }
            ))
            .tint(DesignTokens.Primary.default)
            .labelsHidden()
        }
    }
}
