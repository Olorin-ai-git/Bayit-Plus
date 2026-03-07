#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Compact overlay version of the dubbing mixer shown during playback.
    /// Auto-hides after 5 seconds of inactivity. Reappears on user interaction.
    struct TVDubbingMixerOverlay: View {
        @Environment(LocalizationManager.self) private var localization

        @Binding var balance: Float
        let isActive: Bool
        @Binding var isVisible: Bool

        @State private var hideTask: Task<Void, Never>?

        /// Step size for each remote swipe
        private let stepSize: Float = 0.05
        /// Seconds before auto-hide
        private let autoHideDelay: UInt64 = 5

        var body: some View {
            if isVisible && isActive {
                overlayContent
                    .transition(.asymmetric(
                        insertion: .move(edge: .bottom).combined(with: .opacity),
                        removal: .opacity
                    ))
                    .onAppear { scheduleAutoHide() }
                    .onDisappear { cancelAutoHide() }
            }
        }

        private var overlayContent: some View {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                // Original label
                VStack(spacing: TVDesignTokens.Spacing.xxs) {
                    Text(localization.t("dubbing.original"))
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.secondary)
                    Text("\(originalPercent)%")
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.p300)
                }

                // Compact slider
                compactSlider
                    .frame(maxWidth: 400)

                // Dubbed label
                VStack(spacing: TVDesignTokens.Spacing.xxs) {
                    Text(localization.t("dubbing.dubbed"))
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.secondary)
                    Text("\(dubbedPercent)%")
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.default)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .background {
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                    .fill(Color.black.opacity(0.6))
                    .background(
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                            .fill(.ultraThinMaterial).opacity(0.4)
                            .environment(\.colorScheme, .dark)
                    )
            }
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                    .stroke(Color.white.opacity(0.06), lineWidth: 1)
            )
            .focusable()
            .onMoveCommand { direction in
                handleMove(direction)
                scheduleAutoHide()
            }
        }

        private var compactSlider: some View {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .fill(DesignTokens.Glass.bg)

                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .fill(
                            LinearGradient(
                                colors: [DesignTokens.Primary.p300, DesignTokens.Primary.default],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * CGFloat(balance))

                    Circle()
                        .fill(DesignTokens.Text.primary)
                        .frame(width: 16, height: 16)
                        .shadow(color: .black.opacity(0.3), radius: 3)
                        .offset(x: (geo.size.width - 16) * CGFloat(balance))
                }
            }
            .frame(height: 10)
        }

        private var originalPercent: Int {
            Int((1.0 - balance) * 100)
        }

        private var dubbedPercent: Int {
            Int(balance * 100)
        }

        private func handleMove(_ direction: MoveCommandDirection) {
            withAnimation(.easeOut(duration: 0.15)) {
                switch direction {
                case .left:
                    balance = max(0, balance - stepSize)
                case .right:
                    balance = min(1, balance + stepSize)
                default:
                    break
                }
            }
        }

        private func scheduleAutoHide() {
            cancelAutoHide()
            hideTask = Task {
                try? await Task.sleep(for: .seconds(autoHideDelay))
                guard !Task.isCancelled else { return }
                await MainActor.run {
                    withAnimation { isVisible = false }
                }
            }
        }

        private func cancelAutoHide() {
            hideTask?.cancel()
            hideTask = nil
        }
    }
#endif
