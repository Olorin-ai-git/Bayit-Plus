import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Subtitle demo: video with 4-mode subtitle toggle.
/// Modes: Original, Nikud, Engrew, Heblish
struct SubtitleDemoView: View {
    @Environment(LocalizationManager.self) var localization
    @State private var selectedMode: SubtitleMode = .original

    private enum SubtitleMode: String, CaseIterable {
        case original, nikud, engrew, heblish

        var localizationKey: String {
            "onboarding.tour.subtitles.mode.\(rawValue)"
        }

        var sampleSubtitle: String {
            switch self {
            case .original: return "\u{05D0}\u{05E0}\u{05D9} \u{05D0}\u{05D5}\u{05D4}\u{05D1} \u{05D0}\u{05EA} \u{05D4}\u{05E1}\u{05E8}\u{05D8} \u{05D4}\u{05D6}\u{05D4}"
            case .nikud: return "\u{05D0}\u{05B2}\u{05E0}\u{05B4}\u{05D9} \u{05D0}\u{05D5}\u{05B9}\u{05D4}\u{05B5}\u{05D1} \u{05D0}\u{05B6}\u{05EA} \u{05D4}\u{05B7}\u{05E1}\u{05B6}\u{05E8}\u{05B6}\u{05D8} \u{05D4}\u{05B7}\u{05D6}\u{05B6}\u{05D4}"
            case .engrew: return "Ani ohev et haseret hazeh"
            case .heblish: return "I love this movie hazeh"
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            headerSection
            videoSection
            modeSelector
        }
        .background(DesignTokens.Background.primary)
    }

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("onboarding.tour.subtitles.title"))
                .font(DesignTokens.Typography.title2)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            Text(localization.t("onboarding.tour.subtitles.tagline"))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, DesignTokens.Spacing.xl)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var videoSection: some View {
        ZStack(alignment: .bottom) {
            InlineVideoPlayer(assetName: "demo_subtitles_split")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

            subtitleOverlay
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private var subtitleOverlay: some View {
        Text(selectedMode.sampleSubtitle)
            .font(DesignTokens.Typography.headline)
            .foregroundStyle(.white)
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.md)
            .background(.black.opacity(0.7))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            .padding(.bottom, DesignTokens.Spacing.xl)
            .animation(.easeInOut, value: selectedMode)
            .id(selectedMode)
    }

    private var modeSelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(SubtitleMode.allCases, id: \.self) { mode in
                    GlassButton(
                        localization.t(mode.localizationKey),
                        variant: mode == selectedMode ? .primary : .ghost,
                        size: .small
                    ) {
                        withAnimation { selectedMode = mode }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
        }
        .padding(.bottom, DesignTokens.Spacing.xl)
    }
}
