import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVAvatarPreferencesView + Helpers

extension TVAvatarPreferencesView {
    // MARK: - Section Header

    func sectionHeader(title: String, icon: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    func selectionRow(title: String, icon: String? = nil, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(isSelected ? DesignTokens.Primary.p300 : DesignTokens.Text.muted)
                        .frame(width: 40, height: 40)
                }

                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(isSelected ? DesignTokens.Primary.default : DesignTokens.Text.disabled)
            }
            .padding(TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
        .tvFocusStyle()
    }

    var animationLevels: [(label: String, value: Double)] {
        [("Minimal", 0.0), ("Subtle", 0.25), ("Moderate", 0.5), ("Dynamic", 1.0)]
    }

    func styleIcon(for style: String) -> String {
        switch style {
        case "orb": return "circle.circle"
        case "wave": return "waveform"
        case "geometric": return "hexagon"
        case "crystal": return "diamond"
        default: return "circle"
        }
    }

    func personalityIcon(for personality: String) -> String {
        switch personality {
        case "friendly": return "face.smiling"
        case "professional": return "briefcase"
        case "playful": return "sparkles"
        case "wise": return "book"
        default: return "person"
        }
    }

    var animationLevelString: String {
        if animationLevel < 0.25 { return "minimal" }
        if animationLevel < 0.5 { return "subtle" }
        if animationLevel < 0.75 { return "moderate" }
        return "dynamic"
    }

    static func animationDouble(from level: String?) -> Double {
        switch level {
        case "minimal": return 0.0
        case "subtle": return 0.25
        case "moderate": return 0.5
        case "dynamic": return 1.0
        default: return 0.5
        }
    }
}
