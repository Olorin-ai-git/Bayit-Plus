#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Horizontal slider for adjusting the balance between original and dubbed audio.
    /// Uses Siri Remote trackpad swipe left/right via onMoveCommand.
    /// Displays percentage labels: "Original 70% / Dubbed 30%".
    struct TVDubbingMixerView: View {
        @Environment(LocalizationManager.self) private var localization

        /// Balance from 0.0 (all original) to 1.0 (all dubbed)
        @Binding var balance: Float
        let isActive: Bool

        /// Step size for each remote swipe
        private let stepSize: Float = 0.05

        var body: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                headerLabel

                mixerSlider

                balanceLabels

                Text(localization.t("dubbing.adjustHint"))
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(TVDesignTokens.Spacing.xxl)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
            .focusable()
            .onMoveCommand { direction in
                handleMove(direction)
            }
        }

        private var headerLabel: some View {
            HStack {
                Text(localization.t("dubbing.mixer"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                if isActive {
                    Image(systemName: "waveform")
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Primary.default)
                        .symbolEffect(.variableColor.iterative, isActive: isActive)
                }
            }
        }

        private var mixerSlider: some View {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    // Track background
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .fill(DesignTokens.Glass.bg)

                    // Original portion (left)
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                        .fill(DesignTokens.Primary.p300)
                        .frame(width: geo.size.width * CGFloat(1.0 - balance))

                    // Dubbed portion (right, overlays from right)
                    HStack(spacing: 0) {
                        Spacer()
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                            .fill(DesignTokens.Primary.default)
                            .frame(width: geo.size.width * CGFloat(balance))
                    }

                    // Thumb indicator
                    Circle()
                        .fill(DesignTokens.Text.primary)
                        .frame(width: 24, height: 24)
                        .shadow(color: .black.opacity(0.3), radius: 4)
                        .offset(x: (geo.size.width - 24) * CGFloat(balance))
                }
            }
            .frame(height: 16)
        }

        private var balanceLabels: some View {
            HStack {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                    Text(localization.t("dubbing.original"))
                        .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.secondary)
                    Text("\(originalPercent)%")
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.p300)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: TVDesignTokens.Spacing.xxs) {
                    Text(localization.t("dubbing.dubbed"))
                        .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.secondary)
                    Text("\(dubbedPercent)%")
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.default)
                }
            }
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
    }
#endif
