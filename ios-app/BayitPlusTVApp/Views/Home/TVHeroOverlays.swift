#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Live TV Proof Overlay

    struct TVHeroLiveTVOverlay: View {
        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            VStack {
                HStack {
                    Spacer()
                    VStack(alignment: .trailing, spacing: TVDesignTokens.Spacing.xs) {
                        liveBadge
                        liveAIFeatureStrip
                    }
                    .padding(.top, TVDesignTokens.Spacing.xl)
                    .padding(.trailing, TVDesignTokens.Spacing.xl)
                }
                Spacer()
            }
            .allowsHitTesting(false)
        }

        private var liveBadge: some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Circle()
                    .fill(.red)
                    .frame(width: 8, height: 8)

                Text("LIVE")
                    .font(.system(
                        size: TVDesignTokens.FontSize.xs,
                        weight: .bold
                    ))
                    .foregroundStyle(.white)

                Rectangle()
                    .fill(Color.white.opacity(0.3))
                    .frame(width: 1, height: 14)

                HStack(spacing: TVDesignTokens.Spacing.xxs) {
                    Image(systemName: "waveform")
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .bold
                        ))
                    Text(localization.t("cinematic.overlay.aiDubbed"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .bold
                        ))
                }
                .foregroundStyle(DesignTokens.Primary.p300)

                Rectangle()
                    .fill(Color.white.opacity(0.3))
                    .frame(width: 1, height: 14)

                HStack(spacing: TVDesignTokens.Spacing.xxs) {
                    Image(systemName: "captions.bubble")
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .bold
                        ))
                    Text(localization.t("cinematic.overlay.liveSubtitles"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .bold
                        ))
                }
                .foregroundStyle(DesignTokens.Text.secondary)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(Capsule())
            .overlay(
                Capsule().stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }

        private var liveAIFeatureStrip: some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                featurePill(icon: "captions.bubble", label: localization.t("cinematic.liveAI.feature.subtitles"))
                featurePill(icon: "waveform", label: localization.t("cinematic.liveAI.feature.dubbing"))
                featurePill(icon: "questionmark.bubble", label: localization.t("cinematic.liveAI.feature.trivia"))
                featurePill(icon: "backward.end", label: localization.t("cinematic.liveAI.feature.catchUp"))
            }
            .opacity(0.7)
        }

        private func featurePill(icon: String, label: String) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.xxs) {
                Image(systemName: icon)
                    .font(.system(size: 11, weight: .semibold))
                Text(label)
                    .font(.system(size: 11, weight: .semibold))
            }
            .foregroundStyle(DesignTokens.Text.secondary)
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .padding(.vertical, TVDesignTokens.Spacing.xxs)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(Capsule())
            .overlay(
                Capsule().stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }
    }

    // MARK: - BYOC Showcase Overlay

    struct TVHeroBYOCOverlay: View {
        @Environment(LocalizationManager.self) private var localization
        @State private var sparkleOpacity: Double = 0.6

        var body: some View {
            VStack {
                HStack {
                    Spacer()
                    pauseAskChip
                        .padding(.top, TVDesignTokens.Spacing.xl)
                        .padding(.trailing, TVDesignTokens.Spacing.xl)
                }
                Spacer()
            }
            .allowsHitTesting(false)
            .task {
                while !Task.isCancelled {
                    withAnimation(.easeInOut(duration: 1.0)) {
                        sparkleOpacity = sparkleOpacity == 0.6 ? 1.0 : 0.6
                    }
                    try? await Task.sleep(for: .seconds(1))
                }
            }
        }

        private var pauseAskChip: some View {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: "sparkles")
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm,
                        weight: .bold
                    ))
                    .opacity(sparkleOpacity)
                Text(localization.t("cinematic.overlay.pauseAskReady"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm,
                        weight: .semibold
                    ))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(Capsule())
            .overlay(
                Capsule().stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }
    }

    // MARK: - Movie AI Overlay

    struct TVHeroMovieAIOverlay: View {
        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            VStack {
                HStack {
                    Spacer()
                    movieAIPills
                        .padding(.top, TVDesignTokens.Spacing.xl)
                        .padding(.trailing, TVDesignTokens.Spacing.xl)
                }
                Spacer()
            }
            .allowsHitTesting(false)
        }

        private var movieAIPills: some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                featurePill(
                    icon: "text.bubble",
                    label: localization.t("cinematic.movieAI.feature.pauseAsk")
                )
                featurePill(
                    icon: "person.wave.2",
                    label: localization.t("cinematic.movieAI.feature.interactive")
                )
            }
        }

        private func featurePill(icon: String, label: String) -> some View {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: icon)
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm,
                        weight: .semibold
                    ))
                Text(label)
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm,
                        weight: .semibold
                    ))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(Capsule())
            .overlay(
                Capsule().stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }
    }

    // MARK: - Continue Watching Overlay

    struct TVHeroContinueWatchingOverlay: View {
        let progress: Double

        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            VStack {
                Spacer()
                HStack {
                    progressBar
                    aiEnhancedPill
                    Spacer()
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.bottom, TVDesignTokens.Spacing.xxxxl)
            }
            .allowsHitTesting(false)
        }

        private var progressBar: some View {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.15))
                    Capsule()
                        .fill(DesignTokens.Primary.default)
                        .frame(
                            width: geo.size.width * min(max(progress, 0), 1)
                        )
                }
            }
            .frame(width: 200, height: 4)
        }

        private var aiEnhancedPill: some View {
            HStack(spacing: TVDesignTokens.Spacing.xxs) {
                Image(systemName: "sparkles")
                    .font(.system(
                        size: TVDesignTokens.FontSize.xs,
                        weight: .bold
                    ))
                Text(localization.t("cinematic.overlay.aiEnhanced"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.xs,
                        weight: .bold
                    ))
            }
            .foregroundStyle(DesignTokens.Primary.p300)
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .padding(.vertical, TVDesignTokens.Spacing.xxs)
            .background(DesignTokens.Primary.p900.opacity(0.4))
            .clipShape(Capsule())
        }
    }
#endif
