import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS subtitle demo: video with focus-based 4-mode subtitle selector.
/// Modes: Original, Nikud, Engrew, Heblish.
struct TVSubtitleDemoView: View {
    @Environment(LocalizationManager.self) var localization
    @State private var selectedMode: SubtitleMode = .original

    private enum SubtitleMode: String, CaseIterable {
        case original, nikud, engrew, heblish

        var localizationKey: String {
            "onboarding.tour.subtitles.mode.\(rawValue)"
        }

        var sampleSubtitle: String {
            switch self {
            case .original:
                return "\u{05D0}\u{05E0}\u{05D9} \u{05D0}\u{05D5}\u{05D4}\u{05D1} \u{05D0}\u{05EA} \u{05D4}\u{05E1}\u{05E8}\u{05D8} \u{05D4}\u{05D6}\u{05D4}"
            case .nikud:
                return "\u{05D0}\u{05B2}\u{05E0}\u{05B4}\u{05D9} \u{05D0}\u{05D5}\u{05B9}\u{05D4}\u{05B5}\u{05D1} \u{05D0}\u{05B6}\u{05EA} \u{05D4}\u{05B7}\u{05E1}\u{05B6}\u{05E8}\u{05B6}\u{05D8} \u{05D4}\u{05B7}\u{05D6}\u{05B6}\u{05D4}"
            case .engrew:
                return "Ani ohev et haseret hazeh"
            case .heblish:
                return "I love this movie hazeh"
            }
        }
    }

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            videoWithSubtitle
            modeSelector
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Video

    private var videoWithSubtitle: some View {
        ZStack(alignment: .bottom) {
            InlineVideoPlayer(assetName: "demo_subtitles_split")
                .clipShape(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                )

            subtitleOverlay
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var subtitleOverlay: some View {
        Text(selectedMode.sampleSubtitle)
            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.lg)
            .background(.black.opacity(0.7))
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
            )
            .padding(.bottom, TVDesignTokens.Spacing.xxl)
            .animation(.easeInOut, value: selectedMode)
            .id(selectedMode)
    }

    // MARK: - Mode Selector

    private var modeSelector: some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(SubtitleMode.allCases, id: \.self) { mode in
                modeButton(mode)
            }
        }
    }

    private func modeButton(_ mode: SubtitleMode) -> some View {
        Button {
            withAnimation { selectedMode = mode }
        } label: {
            Text(localization.t(mode.localizationKey))
                .font(.system(
                    size: TVDesignTokens.FontSize.md,
                    weight: mode == selectedMode ? .bold : .regular
                ))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
                .background(
                    mode == selectedMode
                        ? DesignTokens.Colors.Primary.base.opacity(0.4)
                        : DesignTokens.Glass.bgMedium
                )
                .clipShape(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                )
        }
        .buttonStyle(.card)
    }
}
