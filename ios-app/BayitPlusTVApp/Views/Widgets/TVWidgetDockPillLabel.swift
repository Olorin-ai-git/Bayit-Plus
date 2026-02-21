#if os(tvOS)
    import BayitDesignSystem
    import SwiftUI

    // MARK: - Dock Pill Label (focus-aware)

    /// Icon circle that displays a floating title tooltip when focused.
    struct DockPillLabel: View {
        @Environment(\.isFocused) private var isFocused

        let widget: WidgetItem

        var body: some View {
            ZStack {
                Circle()
                    .fill(badgeColor.opacity(0.2))
                    .frame(width: 56, height: 56)
                    .overlay(
                        Circle()
                            .stroke(badgeColor.opacity(0.4), lineWidth: 1.5)
                    )

                Image(systemName: iconName)
                    .font(.system(size: 24, weight: .medium))
                    .foregroundStyle(badgeColor)
            }
            .overlay(alignment: .top) {
                if isFocused {
                    focusLabel
                        .offset(y: -40)
                        .transition(.opacity.combined(with: .scale(scale: 0.8)))
                }
            }
            .animation(
                .spring(duration: 0.25, bounce: 0.15),
                value: isFocused
            )
        }

        private var focusLabel: some View {
            Text(widget.title)
                .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(1)
                .padding(.horizontal, TVDesignTokens.Spacing.sm)
                .padding(.vertical, TVDesignTokens.Spacing.xxs)
                .background {
                    Capsule()
                        .fill(.thinMaterial)
                        .environment(\.colorScheme, .dark)
                }
                .overlay(
                    Capsule().stroke(DesignTokens.Glass.borderLight, lineWidth: 1)
                )
        }

        private var iconName: String {
            widget.content?.contentType?.iconName ?? "square.grid.2x2"
        }

        private var badgeColor: Color {
            switch widget.content?.contentType {
            case .liveChannel, .live: return DesignTokens.Primary.p400
            case .radio: return DesignTokens.Warning.default
            case .podcast: return DesignTokens.Success.default
            case .vod, .audiobook: return DesignTokens.Primary.p300
            case .iframe: return DesignTokens.Text.secondary
            default: return DesignTokens.Text.muted
            }
        }
    }
#endif
