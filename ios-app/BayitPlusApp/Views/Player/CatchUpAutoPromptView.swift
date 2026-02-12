#if os(iOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Auto-prompt overlay shown when a user joins a live channel in progress.
/// Equivalent to the web app's `CatchUpOverlay` component.
///
/// Shows a countdown timer, credit cost info, and accept/decline buttons.
/// Haptic feedback on accept. Accessibility announced as alert.
struct CatchUpAutoPromptView: View {
    @Environment(LocalizationManager.self) private var localization

    let programName: String?
    let creditCost: Int
    let creditBalance: Int
    let autoDismissSeconds: Int
    let onAccept: () -> Void
    let onDecline: () -> Void

    @State private var secondsRemaining: Int
    @State private var countdownTask: Task<Void, Never>?

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
        VStack(spacing: DesignTokens.Spacing.md) {
            headerSection
            creditInfoSection

            if isLowBalance {
                lowBalanceWarning
            }

            countdownProgress
            actionButtons
        }
        .padding(DesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgStrong)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xl))
        .frame(maxWidth: 340)
        .transition(.opacity)
        .accessibilityAddTraits(.isModal)
        .accessibilityElement(children: .contain)
        .onAppear { startCountdown() }
        .onDisappear { countdownTask?.cancel() }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "clock.arrow.circlepath")
                .font(.system(size: 32))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("catchup.overlay.title"))
                .font(.system(
                    size: DesignTokens.FontSize.lg, weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)

            if let name = programName {
                Text(localization.t(
                    "catchup.overlay.description",
                    ["programName": name]
                ))
                .font(.system(size: DesignTokens.FontSize.sm))
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
                "balance": String(creditBalance)
            ]
        ))
        .font(.system(size: DesignTokens.FontSize.sm))
        .foregroundStyle(DesignTokens.Text.muted)
        .multilineTextAlignment(.center)
    }

    // MARK: - Low Balance Warning

    private var lowBalanceWarning: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 14))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(localization.t("catchup.overlay.lowBalanceWarning"))
                .font(.system(
                    size: DesignTokens.FontSize.xs, weight: .medium
                ))
                .foregroundStyle(DesignTokens.Warning.default)
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(DesignTokens.Warning.default.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }

    // MARK: - Countdown

    private var countdownProgress: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 4)

                    RoundedRectangle(cornerRadius: 2)
                        .fill(DesignTokens.Primary.p400)
                        .frame(
                            width: geo.size.width * progressFraction,
                            height: 4
                        )
                        .animation(
                            .linear(duration: 1),
                            value: secondsRemaining
                        )
                }
            }
            .frame(height: 4)

            Text("\(secondsRemaining)s")
                .font(.system(
                    size: DesignTokens.FontSize.xs,
                    design: .monospaced
                ))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    private var progressFraction: CGFloat {
        guard autoDismissSeconds > 0 else { return 0 }
        return CGFloat(secondsRemaining) / CGFloat(autoDismissSeconds)
    }

    // MARK: - Buttons

    private var actionButtons: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            GlassButton(
                localization.t(
                    "catchup.overlay.acceptButton",
                    ["cost": String(creditCost)]
                ),
                variant: .primary
            ) {
                HapticFeedbackService.notification(type: .success)
                countdownTask?.cancel()
                onAccept()
            }

            GlassButton(
                localization.t("catchup.overlay.declineButton"),
                variant: .ghost
            ) {
                countdownTask?.cancel()
                onDecline()
            }
        }
    }

    // MARK: - Countdown Timer

    private func startCountdown() {
        countdownTask = Task {
            while secondsRemaining > 0, !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { return }
                secondsRemaining -= 1
            }
            guard !Task.isCancelled else { return }
            onDecline()
        }
    }
}
#endif
