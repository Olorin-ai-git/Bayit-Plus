#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS auto-prompt overlay shown when a user joins a live channel in progress.
    /// Uses focus-based navigation for Siri Remote. Countdown auto-declines.
    struct TVCatchUpAutoPromptView: View {
        @Environment(LocalizationManager.self) var localization

        let programName: String?
        let creditCost: Int
        let creditBalance: Int
        let autoDismissSeconds: Int
        let onAccept: () -> Void
        let onDecline: () -> Void

        @State var secondsRemaining: Int
        @State var countdownTask: Task<Void, Never>?

        private var isLowBalance: Bool {
            creditBalance <= creditCost * 3
        }

        init(
            programName: String?,
            creditCost: Int,
            creditBalance: Int,
            autoDismissSeconds: Int,
            onAccept: @escaping () -> Void,
            onDecline: @escaping () -> Void
        ) {
            self.programName = programName
            self.creditCost = creditCost
            self.creditBalance = creditBalance
            self.autoDismissSeconds = autoDismissSeconds
            self.onAccept = onAccept
            self.onDecline = onDecline
            _secondsRemaining = State(initialValue: autoDismissSeconds)
        }

        var body: some View {
            ZStack {
                Color.black.opacity(0.7).ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    headerSection
                    creditInfoSection

                    if isLowBalance {
                        lowBalanceWarning
                    }

                    countdownProgress
                    actionButtons
                }
                .padding(TVDesignTokens.Spacing.xxl)
                .frame(maxWidth: 600)
                .background(modalBackground)
                .clipShape(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                        .stroke(DesignTokens.Glass.borderBright, lineWidth: 1.5)
                )
                .shadow(color: .black.opacity(0.6), radius: 40, y: 16)
            }
            .focusSection()
            .accessibilityAddTraits(.isModal)
            .onAppear { startCountdown() }
            .onDisappear { countdownTask?.cancel() }
            .onExitCommand { onDecline() }
        }

        // MARK: - Background

        private var modalBackground: some View {
            ZStack {
                Image("onboarding_catchup_byoc")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .overlay(Color.black.opacity(0.75))

                Color.black.opacity(0.3)
                DesignTokens.Glass.bgStrong
            }
        }

        // MARK: - Header

        private var headerSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "clock.arrow.circlepath")
                    .font(.system(size: 48))
                    .foregroundStyle(DesignTokens.Primary.p400)

                Text(localization.t("catchup.overlay.title"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.xxl, weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                if let name = programName {
                    Text(localization.t(
                        "catchup.overlay.description",
                        ["programName": name]
                    ))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                }
            }
        }

        // MARK: - Credit Info

        private var creditInfoSection: some View {
            Text(localization.t(
                "catchup.overlay.creditContext",
                [
                    "cost": String(creditCost),
                    "balance": String(creditBalance),
                ]
            ))
            .font(.system(size: TVDesignTokens.FontSize.sm))
            .foregroundStyle(DesignTokens.Text.muted)
            .multilineTextAlignment(.center)
        }

        // MARK: - Low Balance Warning

        private var lowBalanceWarning: some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(DesignTokens.Warning.default)
                Text(localization.t("catchup.overlay.lowBalanceWarning"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm, weight: .medium
                    ))
                    .foregroundStyle(DesignTokens.Warning.default)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(DesignTokens.Warning.default.opacity(0.15))
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
            )
        }

        var progressFraction: CGFloat {
            guard autoDismissSeconds > 0 else { return 0 }
            return CGFloat(secondsRemaining) / CGFloat(autoDismissSeconds)
        }
    }
#endif
