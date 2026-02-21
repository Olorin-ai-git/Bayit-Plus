import BayitDesignSystem
import SwiftUI

// MARK: - TVSplitSubtitleOverlayView + Shared Components

extension TVSplitSubtitleOverlayView {
    func subtitleBubble(
        text: String,
        font: CGFloat,
        weight: Font.Weight,
        color: Color,
        bgOpacity: Double
    ) -> some View {
        Text(text)
            .font(.system(size: font, weight: weight))
            .foregroundStyle(color)
            .multilineTextAlignment(.center)
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(.black.opacity(bgOpacity))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
    }

    func subtitleBubbleWithBorder(
        text: String,
        font: CGFloat,
        weight: Font.Weight,
        color: Color,
        bgOpacity: Double,
        borderEdge: Edge,
        borderColor: Color
    ) -> some View {
        Text(text)
            .font(.system(size: font, weight: weight))
            .foregroundStyle(color)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(.black.opacity(bgOpacity))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
            .shadow(color: .black.opacity(0.8), radius: 4, x: 0, y: 0)
            .overlay(alignment: borderEdge == .leading ? .leading : .trailing) {
                Rectangle()
                    .fill(borderColor)
                    .frame(width: 3)
                    .clipShape(
                        UnevenRoundedRectangle(
                            topLeadingRadius: borderEdge == .leading ? TVDesignTokens.Radius.sm : 0,
                            bottomLeadingRadius: borderEdge == .leading ? TVDesignTokens.Radius.sm : 0,
                            bottomTrailingRadius: borderEdge == .trailing ? TVDesignTokens.Radius.sm : 0,
                            topTrailingRadius: borderEdge == .trailing ? TVDesignTokens.Radius.sm : 0
                        )
                    )
            }
    }

    func languageLabel(_ code: String, modeLabel: String? = nil) -> some View {
        let info = SubtitleLanguages.info(for: code)
        let name = info?.nativeName ?? code
        let displayText = modeLabel.map { "\(name) (\($0))" } ?? name

        return HStack(spacing: 8) {
            if let emojiFlag = info?.emojiFlag {
                Text(emojiFlag)
                    .font(.system(size: 22))
            }
            Text(displayText)
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(Color.white.opacity(0.7))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.white.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm / 2))
    }

    func activeCue(from cues: [SubtitleCue]) -> SubtitleCue? {
        cues.first {
            guard let start = $0.startTime, let end = $0.endTime else { return false }
            return currentTime >= start && currentTime <= end
        }
    }
}

// MARK: - Edge Helpers

extension Edge {
    var alignment: Alignment {
        switch self {
        case .top: return .top
        case .leading: return .leading
        case .bottom: return .bottom
        case .trailing: return .trailing
        }
    }
}

// MARK: - Color Hex Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
