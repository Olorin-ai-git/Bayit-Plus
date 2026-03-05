import SwiftUI
#if os(macOS)
    import AppKit
#endif

/// Reusable glass-styled button for live AI feature controls.
///
/// Displays an SF Symbol icon with label text, a pulsing green active indicator,
/// connecting spinner, and premium gate styling. Supports split-button actions
/// and tvOS focus navigation.
public struct GlassLiveControlButton: View {
    public enum ControlState {
        case idle, enabled, connecting, premiumLocked, disabled
    }

    let icon: String
    let activeIcon: String
    let label: String
    let state: ControlState
    let isSplitButton: Bool
    let onTap: () -> Void
    let onSplitTap: (() -> Void)?

    public init(
        icon: String, activeIcon: String, label: String,
        state: ControlState = .idle, isSplitButton: Bool = false,
        onTap: @escaping () -> Void, onSplitTap: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.activeIcon = activeIcon
        self.label = label
        self.state = state
        self.isSplitButton = isSplitButton
        self.onTap = onTap
        self.onSplitTap = onSplitTap
    }

    @State private var pulseOpacity: Double = 1.0

    private var isActive: Bool {
        state == .enabled || state == .connecting
    }

    public var body: some View {
        buttonRow
            .background(backgroundView)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay(borderOverlay)
            .opacity(state == .disabled ? 0.6 : 1.0)
            .accessibilityElement(children: .combine)
            .accessibilityLabel(label)
            .accessibilityValue(accessibilityValue)
            .accessibilityHint(accessibilityHint)
        #if os(tvOS)
            .focusable()
            .focusEffectDisabled()
            .tvFocusStyle()
        #endif
    }

    private var buttonRow: some View {
        HStack(spacing: 0) {
            mainButton
            if isSplitButton, let splitAction = onSplitTap {
                Rectangle().fill(DesignTokens.Glass.border).frame(width: 1, height: 28)
                Button {
                    haptic(.light); splitAction()
                } label: {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .frame(width: 28, height: 36)
                }
                .buttonStyle(LiveControlButtonStyle())
                #if os(tvOS)
                    .focusEffectDisabled()
                #endif
            }
        }
    }

    private var borderOverlay: some View {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
            .stroke(borderColor, style: borderStroke)
    }

    // MARK: - Main Button

    private var mainButton: some View {
        Button {
            haptic(.medium); onTap()
        } label: {
            HStack(spacing: DesignTokens.Spacing.xs) {
                ZStack {
                    iconView
                    if state == .connecting { GlassSpinner(size: .small) }
                    if isActive { pulsingDot }
                }
                .frame(width: 24, height: 24)
                Text(label)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(isActive ? DesignTokens.Text.primary : DesignTokens.Text.secondary)
                    .lineLimit(1)
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
        }
        .buttonStyle(LiveControlButtonStyle())
        #if os(tvOS)
            .focusEffectDisabled()
        #endif
            .disabled(state == .disabled)
    }

    @ViewBuilder
    private var iconView: some View {
        if state == .premiumLocked {
            Image(systemName: "star.fill").font(.system(size: 14))
                .foregroundStyle(DesignTokens.gold)
        } else {
            Image(systemName: isActive ? activeIcon : icon).font(.system(size: 16))
                .foregroundStyle(isActive ? DesignTokens.Primary.p300 : DesignTokens.Text.primary)
        }
    }

    // MARK: - Accessibility

    private var isReduceMotionEnabled: Bool {
        #if os(iOS) || os(tvOS)
            UIAccessibility.isReduceMotionEnabled
        #else
            NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
        #endif
    }

    // MARK: - Pulsing Indicator

    private var pulsingDot: some View {
        Circle()
            .fill(DesignTokens.Success.default)
            .frame(width: 8, height: 8)
            .opacity(isReduceMotionEnabled ? 1.0 : pulseOpacity)
            .onAppear {
                guard !isReduceMotionEnabled else { return }
                withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                    pulseOpacity = 0.2
                }
            }
            .offset(x: 10, y: -8)
    }

    // MARK: - Background & Border

    private var backgroundView: some View {
        ZStack {
            if isActive {
                DesignTokens.Primary.p900.opacity(0.6)
            } else {
                Color.adaptive(
                    light: { PlatformColor.white.withAlphaComponent(0.92) },
                    dark: { PlatformColor.black.withAlphaComponent(0.85) }
                )
            }
            VisualEffectBlur().opacity(isActive ? 0.3 : 1.0)
        }
    }

    private var borderColor: Color {
        switch state {
        case .enabled, .connecting: return DesignTokens.Primary.p400
        case .premiumLocked: return DesignTokens.gold
        default: return DesignTokens.Glass.border
        }
    }

    private var borderStroke: StrokeStyle {
        state == .premiumLocked
            ? StrokeStyle(lineWidth: 1.5, dash: [4, 3])
            : StrokeStyle(lineWidth: 1)
    }

    // MARK: - Accessibility

    private var accessibilityValue: String {
        switch state {
        case .idle: return "Off"
        case .enabled: return "On"
        case .connecting: return "Connecting"
        case .premiumLocked: return "Premium required"
        case .disabled: return "Unavailable"
        }
    }

    private var accessibilityHint: String {
        switch state {
        case .premiumLocked: return "Upgrade to Premium to use this feature"
        case .disabled: return "This feature is currently unavailable"
        default: return "Double tap to toggle"
        }
    }

    // MARK: - Haptics

    #if os(iOS)
        private func haptic(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
            UIImpactFeedbackGenerator(style: style).impactOccurred()
        }
    #else
        private enum HapticStyle { case light, medium, heavy }
        private func haptic(_: HapticStyle) {}
    #endif
}

private struct LiveControlButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(.easeInOut(duration: 0.12), value: configuration.isPressed)
    }
}
