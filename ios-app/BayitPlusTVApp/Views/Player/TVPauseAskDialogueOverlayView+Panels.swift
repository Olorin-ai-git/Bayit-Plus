#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Polishing, Idle, and Error Panels

    extension TVPauseAskDialogueOverlayView {
        // MARK: - Polishing Progress

        var polishingProgressView: some View {
            let stages = polishingStageKeys
            let key = stages[polishingStageIndex % stages.count]
            let text: String = if key.contains("generic") {
                localization.t(
                    key,
                    ["name": viewModel.selectedCharacter?.name ?? ""]
                )
            } else {
                localization.t(key)
            }

            return HStack {
                Spacer()
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    Spacer()
                    GlassSpinner(size: .large)
                    Text(text)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .multilineTextAlignment(.center)
                        .animation(
                            .easeInOut(duration: 0.4), value: polishingStageIndex
                        )
                    Text(localization.t("player.pauseAsk.stages.enjoyMovie"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.sm,
                            weight: .medium
                        ))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .multilineTextAlignment(.center)
                        .padding(.top, TVDesignTokens.Spacing.sm)
                    Spacer()
                }
                .frame(width: 400)
                .padding(TVDesignTokens.Spacing.xl)
                .background(DesignTokens.Glass.bgStrong)
                .clipShape(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
                .padding(.trailing, TVDesignTokens.Spacing.xxl)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel(text)
            .onAppear { startPolishingTimer() }
            .onDisappear { stopPolishingTimer() }
        }

        func startPolishingTimer() {
            polishingStageIndex = 0
            polishingTimer = Timer.scheduledTimer(
                withTimeInterval: 5, repeats: true
            ) { _ in
                Task { @MainActor in polishingStageIndex += 1 }
            }
        }

        func stopPolishingTimer() {
            polishingTimer?.invalidate()
            polishingTimer = nil
            polishingStageIndex = 0
        }

        var polishingStageKeys: [String] {
            let base = "player.pauseAsk.stages"
            let generic = ["\(base).polishing", "\(base).thinking"]
            return generic + characterStageKeys(base: base)
        }

        func characterStageKeys(base: String) -> [String] {
            let name = viewModel.selectedCharacter?.name.lowercased() ?? ""
            if name.contains("biff") {
                return (1 ... 4).map { "\(base).biff\($0)" }
            } else if name.contains("doc") {
                return (1 ... 4).map { "\(base).doc\($0)" }
            } else if name.contains("marty") {
                return (1 ... 4).map { "\(base).marty\($0)" }
            } else if name.contains("george") {
                return (1 ... 4).map { "\(base).george\($0)" }
            } else if name.contains("lorraine") {
                return (1 ... 4).map { "\(base).lorraine\($0)" }
            } else if name.contains("jennifer") {
                return (1 ... 4).map { "\(base).jennifer\($0)" }
            } else {
                return (1 ... 4).map { "\(base).generic\($0)" }
            }
        }

        // MARK: - Idle Panel

        var idlePanel: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Spacer()
                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    if lastResponse != nil {
                        Button {
                            replayLastExchange()
                        } label: {
                            HStack(spacing: TVDesignTokens.Spacing.sm) {
                                Image(systemName: "arrow.clockwise")
                                    .font(.system(size: TVDesignTokens.FontSize.md))
                                Text(localization.t("player.pauseAsk.watchAgain"))
                                    .font(.system(
                                        size: TVDesignTokens.FontSize.md,
                                        weight: .semibold
                                    ))
                            }
                            .foregroundStyle(DesignTokens.Text.primary)
                            .padding(.horizontal, TVDesignTokens.Spacing.lg)
                            .padding(.vertical, TVDesignTokens.Spacing.md)
                        }
                        .tvCardStyle()
                        .focused($idleFocus, equals: .replay)
                        .accessibilityLabel(
                            localization.t("player.pauseAsk.watchAgain")
                        )
                        .accessibilityHint("Replays the last exchange")
                    }
                    GlassButton(
                        localization.t("player.pauseAsk.askAnother"),
                        variant: .primary, size: .large
                    ) { phase = .input; messageText = "" }
                    GlassButton(
                        localization.t("player.pauseAsk.resumeMovie"),
                        variant: .secondary, size: .large
                    ) { onDismiss() }
                }

                if isWalkthroughMode {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(
                                size: TVDesignTokens.FontSize.sm,
                                weight: .bold
                            ))
                            .foregroundStyle(DesignTokens.Primary.p300)
                        Text(localization.t("player.pauseAsk.worksOnAnyContent"))
                            .font(.system(
                                size: TVDesignTokens.FontSize.sm,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.sm)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(Capsule())
                }

                Spacer()
                    .frame(height: TVDesignTokens.Spacing.xxl)
            }
            .onAppear { idleFocus = lastResponse != nil ? .replay : nil }
        }

        func replayLastExchange() {
            guard let response = lastResponse else { return }
            Task { await playResponse(response) }
        }

        // MARK: - Error Panel

        var errorPanel: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Spacer()
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: TVDesignTokens.FontSize.xxl))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                    .accessibilityHidden(true)

                Text(errorTitle)
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg, weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)

                Text(viewModel.lastError ?? localization.t("common.tryAgain"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)

                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    GlassButton(
                        localization.t("common.retry"),
                        variant: .primary, size: .large
                    ) { retryLastMessage() }
                    GlassButton(
                        localization.t("player.pauseAsk.resumeMovie"),
                        variant: .secondary, size: .large
                    ) { onDismiss() }
                }
                Spacer()
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Error: \(errorTitle)")
        }

        var errorTitle: String {
            guard let service = viewModel.lastFailedService else {
                return localization.t("player.pauseAsk.error.generic")
            }
            switch service {
            case "anthropic":
                return localization.t("player.pauseAsk.error.anthropic")
            case "fal_ai":
                return localization.t("player.pauseAsk.error.falAi")
            case "elevenlabs":
                return localization.t("player.pauseAsk.error.elevenlabs")
            case "credits":
                return localization.t("player.pauseAsk.error.credits")
            default:
                return localization.t("player.pauseAsk.error.generic")
            }
        }

        func retryLastMessage() {
            guard !lastFailedMessage.isEmpty else { phase = .input; return }
            messageText = lastFailedMessage
            lastFailedMessage = ""
            sendQuestion()
        }
    }
#endif
