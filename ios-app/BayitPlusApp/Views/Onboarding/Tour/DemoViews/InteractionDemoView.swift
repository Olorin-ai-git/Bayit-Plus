import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Movie interaction demo: frozen frame with a highlighted character.
/// Tap the character to see a pre-recorded conversation exchange.
struct InteractionDemoView: View {
    @Environment(LocalizationManager.self) var localization
    @State private var showConversation = false
    @State private var messageIndex = 0

    private var messages: [(role: String, key: String)] {
        [
            ("user", "onboarding.tour.interaction.msg1"),
            ("character", "onboarding.tour.interaction.msg2"),
            ("user", "onboarding.tour.interaction.msg3"),
            ("character", "onboarding.tour.interaction.msg4"),
        ]
    }

    private var allMessagesShown: Bool {
        messageIndex >= messages.count
    }

    var body: some View {
        VStack(spacing: 0) {
            headerSection
            frameSection
            if allMessagesShown {
                curatedMomentsHint
                creditInfoFooter
            }
        }
        .background(DesignTokens.Background.primary)
    }

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("onboarding.tour.interaction.title"))
                .font(DesignTokens.Typography.title2)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            Text(localization.t("onboarding.tour.interaction.tagline"))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, DesignTokens.Spacing.xl)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var frameSection: some View {
        ZStack(alignment: .bottom) {
            InlineVideoPlayer(assetName: "demo_movie_interaction")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                .overlay(characterHighlight)

            if showConversation {
                chatOverlay
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            } else {
                tapPrompt
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private var characterHighlight: some View {
        GeometryReader { geo in
            Circle()
                .stroke(DesignTokens.Colors.accentPrimary, lineWidth: 3)
                .frame(width: geo.size.width * 0.2, height: geo.size.width * 0.2)
                .position(x: geo.size.width * 0.5, y: geo.size.height * 0.4)
                .onTapGesture {
                    withAnimation(.spring(response: 0.4)) {
                        showConversation = true
                    }
                    advanceMessages()
                }
                .opacity(showConversation ? 0 : 1)
        }
    }

    private var tapPrompt: some View {
        Text(localization.t("onboarding.tour.interaction.tapCharacter"))
            .font(DesignTokens.Typography.caption)
            .foregroundStyle(DesignTokens.Colors.textPrimary)
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
            .padding(.bottom, DesignTokens.Spacing.xl)
    }

    private var chatOverlay: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(0 ..< min(messageIndex, messages.count), id: \.self) { idx in
                let msg = messages[idx]
                HStack {
                    if msg.role == "user" { Spacer() }
                    Text(localization.t(msg.key))
                        .font(DesignTokens.Typography.callout)
                        .foregroundStyle(DesignTokens.Colors.textPrimary)
                        .padding(DesignTokens.Spacing.md)
                        .background(
                            msg.role == "user"
                                ? AnyShapeStyle(DesignTokens.Colors.accentPrimary.opacity(0.3))
                                : AnyShapeStyle(DesignTokens.Glass.bg)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                    if msg.role == "character" { Spacer() }
                }
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .padding(DesignTokens.Spacing.md)
    }

    private var curatedMomentsHint: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "sparkles")
                .foregroundStyle(DesignTokens.Colors.accentPrimary)
            Text(localization.t("onboarding.tour.interaction.curatedMoments"))
                .font(DesignTokens.Typography.callout)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.leading)
        }
        .padding(DesignTokens.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .transition(.opacity)
    }

    private var creditInfoFooter: some View {
        Text(localization.t("onboarding.tour.interaction.creditInfo"))
            .font(DesignTokens.Typography.caption)
            .foregroundStyle(DesignTokens.Colors.textTertiary)
            .multilineTextAlignment(.center)
            .padding(.horizontal, DesignTokens.Spacing.xl)
            .padding(.bottom, DesignTokens.Spacing.md)
            .transition(.opacity)
    }

    private func advanceMessages() {
        for i in 1 ... messages.count {
            let delay = Double(i) * 1.2
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                withAnimation(.spring(response: 0.3)) {
                    messageIndex = i
                }
            }
        }
    }
}
