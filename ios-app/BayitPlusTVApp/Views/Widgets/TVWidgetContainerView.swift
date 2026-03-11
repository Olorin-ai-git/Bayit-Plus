#if os(tvOS)
    import AVFoundation
    import BayitDesignSystem
    import BayitLocalization
    import BayitMedia
    import SwiftUI

    /// Widget card for the tvOS sidebar with poster art resolved from APIs,
    /// content details, and inline playback controls. Glassmorphic design for 10-foot UI.
    /// Custom widgets (e.g. Ynet Mivzakim) render their own content instead of poster+play.
    struct TVWidgetContainerView: View {
        @Environment(LocalizationManager.self) private var localization

        let widget: WidgetItem
        let onMinimize: () -> Void

        @Environment(TVRepositoryProvider.self) private var repos
        @State private var playerVM: WidgetPlayerViewModel?

        var body: some View {
            VStack(alignment: .leading, spacing: 0) {
                if isYnetWidget {
                    TVWidgetYnetContent(widget: widget, onMinimize: onMinimize)
                } else {
                    TVWidgetPosterSection(
                        widget: widget,
                        playerVM: playerVM,
                        onMinimize: onMinimize
                    )
                    TVWidgetInfoSection(
                        widget: widget,
                        playerVM: $playerVM,
                        localization: localization
                    )
                }
            }
            .background {
                ZStack {
                    Color.black.opacity(0.25)
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .fill(.thinMaterial)
                        .environment(\.colorScheme, .dark)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(DesignTokens.Glass.border, lineWidth: 2)
            )
            .task {
                guard !isYnetWidget else { return }
                if playerVM == nil {
                    playerVM = WidgetPlayerViewModel(
                        mediaRepo: repos.media,
                        contentRepo: repos.content,
                        liveTVRepo: repos.liveTV,
                        radioRepo: repos.radio,
                        podcastRepo: repos.podcasts,
                        audiobookRepo: repos.audiobook,
                        localization: localization
                    )
                }
                await playerVM?.resolveCover(for: widget)
            }
        }

        // MARK: - Ynet Widget Detection

        private var isYnetWidget: Bool {
            let componentName = widget.content?.componentName ?? ""
            return componentName == "ynet_mivzakim"
                || widget.title.contains("Ynet")
                || widget.title.contains("\u{05DE}\u{05D1}\u{05D6}\u{05E7}\u{05D9}")
        }
    }

    // MARK: - Minimize Button (shared)

    struct TVWidgetMinimizeButton: View {
        let title: String
        let onMinimize: () -> Void

        var body: some View {
            Button { onMinimize() } label: {
                Image(systemName: "arrow.down.right.and.arrow.up.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .frame(width: 48, height: 48)
                    .background(.thinMaterial)
                    .environment(\.colorScheme, .dark)
                    .clipShape(Circle())
                    .overlay(
                        Circle().stroke(Color.white.opacity(0.2), lineWidth: 1)
                    )
            }
            .buttonStyle(WidgetCompactButtonStyle())
            .focusEffectDisabled()
            .accessibilityLabel("Minimize \(title)")
        }
    }

    // MARK: - Widget Compact Button Style

    /// Lightweight focus style for widget sidebar buttons.
    /// Uses minimal scale (1.03) and a subtle purple ring instead of the
    /// default `.card` + `.tvFocusStyle()` combination which double-scales.
    struct WidgetCompactButtonStyle: ButtonStyle {
        func makeBody(configuration: Configuration) -> some View {
            WidgetCompactButtonBody(
                configuration: configuration,
                isPressed: configuration.isPressed
            )
        }
    }

    private struct WidgetCompactButtonBody: View {
        let configuration: ButtonStyleConfiguration
        let isPressed: Bool
        @Environment(\.isFocused) private var isFocused

        var body: some View {
            configuration.label
                .focusEffectDisabled()
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default)
                        .stroke(
                            isFocused ? DesignTokens.Glass.borderFocus : Color.clear,
                            lineWidth: 2
                        )
                )
                .scaleEffect(isFocused ? 1.03 : 1.0)
                .scaleEffect(isPressed ? 0.96 : 1.0)
                .shadow(
                    color: isFocused
                        ? DesignTokens.Glass.purpleGlow : Color.clear,
                    radius: 8,
                    x: 0,
                    y: isFocused ? 4 : 0
                )
                .animation(
                    .spring(duration: TVDesignTokens.Focus.animationDuration, bounce: 0.2),
                    value: isFocused
                )
                .animation(.easeInOut(duration: 0.1), value: isPressed)
        }
    }

#endif
