import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Tracks AI Gateway card visibility state across sessions.
@Observable
final class AIGatewayState {
    private static let dismissCountKey = "ai.gateway.dismissCount"
    private static let lastDismissSessionKey = "ai.gateway.lastDismissSession"
    private static let permanentlyDismissedKey = "ai.gateway.permanentlyDismissed"
    private static let sessionCountKey = "ai.gateway.sessionCount"
    static let firstBYOCPlayCompletedKey = "ai.gateway.firstBYOCPlayCompleted"
    static let firstAIFeatureUsedKey = "ai.gateway.firstAIFeatureUsed"
    private static let moreContentDismissedKey = "ai.gateway.moreContentDismissed"

    private let defaults: UserDefaults

    var dismissCount: Int
    var lastDismissSession: Int
    var permanentlyDismissed: Bool
    var sessionCount: Int
    var firstBYOCPlayCompleted: Bool
    var firstAIFeatureUsed: Bool
    var moreContentDismissed: Bool

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        dismissCount = defaults.integer(forKey: Self.dismissCountKey)
        lastDismissSession = defaults.integer(forKey: Self.lastDismissSessionKey)
        permanentlyDismissed = defaults.bool(forKey: Self.permanentlyDismissedKey)
        sessionCount = defaults.integer(forKey: Self.sessionCountKey)
        firstBYOCPlayCompleted = defaults.bool(forKey: Self.firstBYOCPlayCompletedKey)
        firstAIFeatureUsed = defaults.bool(forKey: Self.firstAIFeatureUsedKey)
        moreContentDismissed = defaults.bool(forKey: Self.moreContentDismissedKey)
    }

    func incrementSession() {
        sessionCount += 1
        defaults.set(sessionCount, forKey: Self.sessionCountKey)
    }

    func shouldShowCard(hasYouTubeSource: Bool) -> Bool {
        guard !hasYouTubeSource, !permanentlyDismissed else { return false }
        if dismissCount == 0 { return true }
        return sessionCount - lastDismissSession >= 3
    }

    var showDontShowAgain: Bool {
        dismissCount >= 3
    }

    func dismiss() {
        dismissCount += 1
        lastDismissSession = sessionCount
        defaults.set(dismissCount, forKey: Self.dismissCountKey)
        defaults.set(lastDismissSession, forKey: Self.lastDismissSessionKey)
    }

    func permanentlyDismiss() {
        permanentlyDismissed = true
        defaults.set(true, forKey: Self.permanentlyDismissedKey)
    }

    func markFirstBYOCPlay() {
        guard !firstBYOCPlayCompleted else { return }
        firstBYOCPlayCompleted = true
        defaults.set(true, forKey: Self.firstBYOCPlayCompletedKey)
    }

    func markFirstAIFeatureUsed() {
        guard !firstAIFeatureUsed else { return }
        firstAIFeatureUsed = true
        defaults.set(true, forKey: Self.firstAIFeatureUsedKey)
    }

    func shouldShowMoreContentCard(hasYouTubeSource: Bool) -> Bool {
        hasYouTubeSource && firstAIFeatureUsed && !moreContentDismissed
    }

    func dismissMoreContent() {
        moreContentDismissed = true
        defaults.set(true, forKey: Self.moreContentDismissedKey)
    }
}

/// Glass card prompting users to connect YouTube for AI features.
struct AIGatewayCardView: View {
    let onConnectYouTube: () -> Void
    let onLearnMore: () -> Void
    let onDismiss: () -> Void
    let showDontShowAgain: Bool
    let onDontShowAgain: (() -> Void)?

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            headerRow
            subtitleText
            actionButtons
            if showDontShowAgain {
                dontShowAgainButton
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .glassCard(radius: DesignTokens.Radius.lg, padding: 0)
        .overlay(alignment: .topTrailing) { dismissButton }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var headerRow: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "wand.and.stars")
                .font(.system(size: 24))
                .foregroundStyle(DesignTokens.Primary.p400)
            Text(localization.t("ai.gateway.title"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(.trailing, DesignTokens.Spacing.xl)
    }

    private var subtitleText: some View {
        Text(localization.t("ai.gateway.subtitle"))
            .font(.system(size: DesignTokens.FontSize.sm))
            .foregroundStyle(DesignTokens.Text.secondary)
    }

    private var actionButtons: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            GlassButton(
                localization.t("ai.gateway.connectYouTube"),
                variant: .primary,
                size: .medium
            ) { onConnectYouTube() }

            Button {
                onLearnMore()
            } label: {
                Text(localization.t("ai.gateway.learnMore"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
            .buttonStyle(.plain)
        }
    }

    private var dismissButton: some View {
        Button {
            onDismiss()
        } label: {
            Image(systemName: "xmark")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(DesignTokens.Text.muted)
                .padding(DesignTokens.Spacing.sm)
        }
        .buttonStyle(.plain)
    }

    private var dontShowAgainButton: some View {
        Button {
            onDontShowAgain?()
        } label: {
            Text(localization.t("ai.gateway.dontShowAgain"))
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .buttonStyle(.plain)
    }
}

/// Card prompting users to explore additional content integrations.
struct MoreContentCardView: View {
    let onExplore: () -> Void
    let onDismiss: () -> Void

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(localization.t("ai.gateway.moreContent.title"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                Text(localization.t("ai.gateway.moreContent.subtitle"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            Spacer()
            GlassButton(
                localization.t("ai.gateway.moreContent.action"),
                variant: .secondary,
                size: .small
            ) { onExplore() }
        }
        .padding(DesignTokens.Spacing.md)
        .glassCard(radius: DesignTokens.Radius.md, padding: 0)
        .overlay(alignment: .topTrailing) {
            Button { onDismiss() } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .padding(DesignTokens.Spacing.xs)
            }
            .buttonStyle(.plain)
        }
    }
}
