#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Unified credit confirmation dialog for all AI features on tvOS.
    /// Content is driven by `CreditConfirmationCoordinator` state.
    struct TVAICreditConfirmDialog: View {
        @Bindable var coordinator: CreditConfirmationCoordinator
        @Environment(LocalizationManager.self) private var localization
        @FocusState private var focusedButton: ButtonType?

        private enum ButtonType {
            case accept, decline
        }

        var body: some View {
            if case let .showing(
                descriptor, effectiveCost, currentBalance,
                postDeduction, isReauthorization, isInsufficient
            ) = coordinator.state {
                ZStack {
                    Color.black.opacity(0.7)
                        .ignoresSafeArea()
                        .onTapGesture { coordinator.decline() }

                    dialogContent(
                        descriptor: descriptor,
                        effectiveCost: effectiveCost,
                        currentBalance: currentBalance,
                        postDeduction: postDeduction,
                        isReauthorization: isReauthorization,
                        isInsufficient: isInsufficient
                    )
                }
                .onExitCommand { coordinator.decline() }
                .onAppear { focusedButton = .accept }
            }
        }

        // MARK: - Dialog Content

        private func dialogContent(
            descriptor: AIFeatureDescriptor,
            effectiveCost: Double,
            currentBalance: Int,
            postDeduction: Double,
            isReauthorization: Bool,
            isInsufficient: Bool
        ) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                featureIcon(descriptor: descriptor)
                featureTitle(descriptor: descriptor, isReauthorization: isReauthorization)
                featureDescription(descriptor: descriptor)
                costRow(
                    effectiveCost: effectiveCost,
                    postDeduction: postDeduction,
                    isInsufficient: isInsufficient
                )
                balanceBar(currentBalance: currentBalance)
                actionButtons(
                    effectiveCost: effectiveCost,
                    isInsufficient: isInsufficient
                )
            }
            .padding(TVDesignTokens.Spacing.xxl)
            .background(dialogBackground)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(DesignTokens.Glass.borderBright, lineWidth: 1.5)
            )
            .shadow(color: .black.opacity(0.6), radius: 40, y: 16)
        }

        private var dialogBackground: some View {
            ZStack {
                Color.black.opacity(0.85)
                DesignTokens.Glass.bgStrong
            }
        }
    }

    // MARK: - Content Sections

    extension TVAICreditConfirmDialog {
        private func featureIcon(descriptor: AIFeatureDescriptor) -> some View {
            Image(systemName: descriptor.iconSystemName)
                .font(.system(size: TVDesignTokens.FontSize.xxl))
                .foregroundStyle(DesignTokens.Primary.default)
        }

        private func featureTitle(
            descriptor: AIFeatureDescriptor,
            isReauthorization: Bool
        ) -> some View {
            let key = isReauthorization
                ? "\(descriptor.localeKeyPrefix).continueTitle"
                : "\(descriptor.localeKeyPrefix).title"
            return Text(localization.t(key))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }

        private func featureDescription(
            descriptor: AIFeatureDescriptor
        ) -> some View {
            Text(localization.t("\(descriptor.localeKeyPrefix).description"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 500)
        }

        private func costRow(
            effectiveCost: Double,
            postDeduction: Double,
            isInsufficient: Bool
        ) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.xxl) {
                costBadge(effectiveCost: effectiveCost)
                balanceAfterBadge(
                    postDeduction: postDeduction,
                    isInsufficient: isInsufficient
                )
            }
        }

        private func costBadge(effectiveCost: Double) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "sparkles")
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Primary.default)
                Text(localization.t(
                    "ai.confirm.cost",
                    ["cost": formatCost(effectiveCost)]
                ))
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(Color.black.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }

        private func balanceAfterBadge(
            postDeduction: Double,
            isInsufficient: Bool
        ) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: isInsufficient
                    ? "exclamationmark.triangle"
                    : "arrow.right")
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(isInsufficient
                        ? DesignTokens.Colors.Semantic.error
                        : DesignTokens.Text.muted)
                Text(isInsufficient
                    ? localization.t("ai.confirm.balanceInsufficient")
                    : localization.t(
                        "ai.confirm.balanceAfter",
                        ["balance": formatCost(postDeduction)]
                    ))
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(isInsufficient
                        ? DesignTokens.Colors.Semantic.error
                        : DesignTokens.Text.secondary)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(Color.black.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                    .stroke(isInsufficient
                        ? DesignTokens.Colors.Semantic.error.opacity(0.4)
                        : DesignTokens.Glass.border,
                        lineWidth: 1)
            )
        }

        private func balanceBar(currentBalance: Int) -> some View {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 6)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(DesignTokens.Primary.p400)
                        .frame(
                            width: geo.size.width * barFraction(currentBalance),
                            height: 6
                        )
                }
            }
            .frame(height: 6)
            .frame(maxWidth: 400)
        }

        private func barFraction(_ remaining: Int) -> CGFloat {
            // Assume 500 as a reasonable max for visual scaling
            let maxCredits: CGFloat = 500
            return min(CGFloat(remaining) / maxCredits, 1.0)
        }

        private func formatCost(_ value: Double) -> String {
            value.truncatingRemainder(dividingBy: 1) == 0
                ? String(Int(value))
                : String(format: "%.1f", value)
        }
    }

    // MARK: - Action Buttons

    extension TVAICreditConfirmDialog {
        private func actionButtons(
            effectiveCost: Double,
            isInsufficient: Bool
        ) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                acceptButton(
                    effectiveCost: effectiveCost,
                    isInsufficient: isInsufficient
                )
                declineButton
            }
        }

        private func acceptButton(
            effectiveCost: Double,
            isInsufficient: Bool
        ) -> some View {
            let isFocused = focusedButton == .accept
            let label = isInsufficient
                ? localization.t("ai.confirm.acceptUpgrade")
                : localization.t(
                    "ai.confirm.accept",
                    ["cost": formatCost(effectiveCost)]
                )
            return Button(action: { coordinator.accept() }) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: isInsufficient ? "arrow.up.circle" : "checkmark.circle")
                        .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
                    Text(label)
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                        .lineLimit(1)
                        .fixedSize(horizontal: true, vertical: false)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .frame(minWidth: 300, minHeight: 64)
                .background(
                    isFocused
                        ? DesignTokens.Primary.default.opacity(0.6)
                        : DesignTokens.Primary.default.opacity(0.35)
                )
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default)
                        .stroke(
                            isFocused
                                ? DesignTokens.Glass.borderFocus
                                : DesignTokens.Primary.default.opacity(0.3),
                            lineWidth: isFocused ? TVDesignTokens.Focus.ringWidth : 1
                        )
                )
                .shadow(
                    color: isFocused ? DesignTokens.Glass.purpleGlow : .clear,
                    radius: TVDesignTokens.Focus.shadowRadius,
                    x: 0, y: isFocused ? 4 : 0
                )
            }
            .buttonStyle(.card)
            .focused($focusedButton, equals: .accept)
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .animation(.spring(duration: 0.2), value: isFocused)
        }

        private var declineButton: some View {
            let isFocused = focusedButton == .decline
            return Button(action: { coordinator.decline() }) {
                Text(localization.t("ai.confirm.decline"))
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(
                        isFocused
                            ? DesignTokens.Text.primary
                            : DesignTokens.Text.secondary
                    )
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .frame(minWidth: 160, minHeight: 64)
                    .background(
                        isFocused
                            ? Color.white.opacity(0.15)
                            : Color.white.opacity(0.05)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
                    .overlay(
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default)
                            .stroke(
                                isFocused
                                    ? DesignTokens.Glass.borderFocus
                                    : DesignTokens.Glass.border,
                                lineWidth: isFocused ? TVDesignTokens.Focus.ringWidth : 1
                            )
                    )
                    .shadow(
                        color: isFocused ? DesignTokens.Glass.purpleGlow : .clear,
                        radius: TVDesignTokens.Focus.shadowRadius,
                        x: 0, y: isFocused ? 4 : 0
                    )
            }
            .buttonStyle(.card)
            .focused($focusedButton, equals: .decline)
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .animation(.spring(duration: 0.2), value: isFocused)
        }
    }
#endif
