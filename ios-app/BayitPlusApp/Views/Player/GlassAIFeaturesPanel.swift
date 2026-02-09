#if os(iOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Horizontal scrollable panel displaying AI feature controls for live content.
///
/// Renders a sparkles expand/collapse toggle followed by a horizontal carousel
/// of `GlassLiveControlButton` instances for Live Translate, Split Subtitles,
/// Live Dubbing, and Live Trivia. Positioned above `GlassPlayerControls`.
struct GlassAIFeaturesPanel: View {

    @Environment(LocalizationManager.self) private var localization

    let isExpanded: Bool
    let onToggleExpand: () -> Void

    // Feature states
    let isSubtitlesEnabled: Bool
    let isSubtitlesConnecting: Bool
    let isSplitEnabled: Bool
    let isDubbingEnabled: Bool
    let isDubbingConnecting: Bool
    let isDubbingPremiumLocked: Bool
    let isTriviaEnabled: Bool
    let isTriviaConnecting: Bool

    // Actions
    let onSubtitlesTap: () -> Void
    let onSubtitlesSplitTap: () -> Void
    let onSplitSubtitlesTap: () -> Void
    let onDubbingTap: () -> Void
    let onTriviaTap: () -> Void

    private let panelHeight: CGFloat = {
        UIDevice.current.userInterfaceIdiom == .pad ? 56 : 48
    }()

    var body: some View {
        HStack(spacing: 0) {
            expandToggle
            if isExpanded {
                panelDivider
                scrollableControls
            }
        }
        .frame(height: panelHeight)
        .background(panelBackground)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(DesignTokens.Primary.p800.opacity(0.4), lineWidth: 1)
        )
        .padding(.horizontal, DesignTokens.Spacing.base)
        .animation(.spring(duration: 0.3), value: isExpanded)
    }

    // MARK: - Expand Toggle

    private var expandToggle: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            onToggleExpand()
        } label: {
            Image(systemName: "sparkles")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(
                    isExpanded ? DesignTokens.Primary.p400 : DesignTokens.Text.primary
                )
                .frame(width: 44, height: panelHeight)
        }
        .accessibilityLabel(
            isExpanded
                ? localization.t("player.hideAIFeatures")
                : localization.t("player.showAIFeatures")
        )
    }

    // MARK: - Divider

    private var panelDivider: some View {
        Rectangle()
            .fill(DesignTokens.Glass.border)
            .frame(width: 1, height: panelHeight - 16)
    }

    // MARK: - Scrollable Controls

    private var scrollableControls: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                liveTranslateButton
                splitSubtitlesButton
                liveDubbingButton
                liveTriviaButton
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
        }
    }

    // MARK: - Buttons

    private var liveTranslateButton: some View {
        GlassLiveControlButton(
            icon: "captions.bubble",
            activeIcon: "captions.bubble.fill",
            label: localization.t("subtitles.liveTranslate"),
            state: subtitleControlState,
            isSplitButton: true,
            onTap: onSubtitlesTap,
            onSplitTap: onSubtitlesSplitTap
        )
    }

    private var splitSubtitlesButton: some View {
        GlassLiveControlButton(
            icon: "square.split.2x1",
            activeIcon: "square.split.2x1.fill",
            label: localization.t("subtitles.splitScreen.title"),
            state: isSplitEnabled ? .enabled : .idle,
            onTap: onSplitSubtitlesTap
        )
    }

    private var liveDubbingButton: some View {
        GlassLiveControlButton(
            icon: "waveform",
            activeIcon: "waveform.fill",
            label: localization.t("dubbing.title"),
            state: dubbingControlState,
            onTap: onDubbingTap
        )
    }

    private var liveTriviaButton: some View {
        GlassLiveControlButton(
            icon: "lightbulb",
            activeIcon: "lightbulb.fill",
            label: localization.t("player.liveTrivia"),
            state: triviaControlState,
            onTap: onTriviaTap
        )
    }

    // MARK: - State Mapping

    private var subtitleControlState: GlassLiveControlButton.ControlState {
        if isSubtitlesConnecting { return .connecting }
        if isSubtitlesEnabled { return .enabled }
        return .idle
    }

    private var dubbingControlState: GlassLiveControlButton.ControlState {
        if isDubbingPremiumLocked { return .premiumLocked }
        if isDubbingConnecting { return .connecting }
        if isDubbingEnabled { return .enabled }
        return .idle
    }

    private var triviaControlState: GlassLiveControlButton.ControlState {
        if isTriviaConnecting { return .connecting }
        if isTriviaEnabled { return .enabled }
        return .idle
    }

    // MARK: - Background

    private var panelBackground: some View {
        ZStack {
            Color(hex: 0x111122).opacity(0.95)
            VisualEffectBlur()
                .opacity(0.3)
        }
    }
}
#endif
