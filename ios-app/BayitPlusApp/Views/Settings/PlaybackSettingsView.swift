import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Playback preferences: video quality, autoplay, skip intro/credits,
/// playback speed, continue watching, and live TV buffer size.
struct PlaybackSettingsView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: PlaybackSettingsViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    headerSection
                    if vm.isLoading {
                        ProgressView().tint(.white).padding(.top, DesignTokens.Spacing.xxxxl)
                    } else {
                        qualitySection(vm)
                        autoplaySection(vm)
                        playbackControlsSection(vm)
                        liveBufferSection(vm)
                        GlassButton(localization.t("common.save"), isLoading: vm.isSaving) {
                            Task { await vm.save() }
                        }.padding(.horizontal, DesignTokens.Spacing.lg)
                    }
                }.padding(.vertical, DesignTokens.Spacing.lg)
            } else { ScreenLoadingView() }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil { viewModel = PlaybackSettingsViewModel(repository: repos.userSettings) }
            await viewModel?.load()
        }
    }

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "play.rectangle").font(.system(size: 48))
                .foregroundStyle(DesignTokens.Primary.p400)
            Text(localization.t("settings.playback.title"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func qualitySection(_ vm: PlaybackSettingsViewModel) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            settingsSectionLabel(localization.t("settings.playback.videoQuality"))
            ForEach(VideoQuality.allCases) { quality in
                settingsSelectionRow(title: quality.displayName,
                                     isSelected: vm.videoQuality == quality) { vm.videoQuality = quality }
            }
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func autoplaySection(_ vm: PlaybackSettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            settingsSectionLabel(localization.t("settings.playback.autoplaySection"))
            settingsToggleRow(title: localization.t("settings.playback.autoplay"),
                              isOn: Binding(get: { vm.autoplay }, set: { vm.autoplay = $0 }))
            settingsToggleRow(title: localization.t("settings.playback.autoplayNext"),
                              isOn: Binding(get: { vm.autoplayNextEpisode }, set: { vm.autoplayNextEpisode = $0 }))
            GlassCard {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    HStack {
                        Text(localization.t("settings.playback.countdown"))
                            .font(.system(size: DesignTokens.FontSize.md)).foregroundStyle(DesignTokens.Text.primary)
                        Spacer()
                        Text("\(vm.autoplayCountdownSeconds)s")
                            .font(.system(size: DesignTokens.FontSize.sm)).foregroundStyle(DesignTokens.Text.muted).monospacedDigit()
                    }
                    Slider(value: Binding(get: { Double(vm.autoplayCountdownSeconds) },
                                          set: { vm.autoplayCountdownSeconds = Int($0) }),
                           in: 3...15, step: 1).tint(DesignTokens.Primary.default)
                }.padding(DesignTokens.Spacing.md)
            }
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func playbackControlsSection(_ vm: PlaybackSettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            settingsSectionLabel(localization.t("settings.playback.controls"))
            settingsToggleRow(title: localization.t("settings.playback.skipIntro"),
                              isOn: Binding(get: { vm.skipIntro }, set: { vm.skipIntro = $0 }))
            settingsToggleRow(title: localization.t("settings.playback.skipCredits"),
                              isOn: Binding(get: { vm.skipCredits }, set: { vm.skipCredits = $0 }))
            settingsToggleRow(title: localization.t("settings.playback.continueWatching"),
                              isOn: Binding(get: { vm.continueWatching }, set: { vm.continueWatching = $0 }))
            GlassCard {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    HStack {
                        Text(localization.t("settings.playback.speed"))
                            .font(.system(size: DesignTokens.FontSize.md)).foregroundStyle(DesignTokens.Text.primary)
                        Spacer()
                        Text(String(format: "%.1fx", vm.playbackSpeed))
                            .font(.system(size: DesignTokens.FontSize.sm)).foregroundStyle(DesignTokens.Text.muted).monospacedDigit()
                    }
                    Slider(value: Binding(get: { vm.playbackSpeed }, set: { vm.playbackSpeed = $0 }),
                           in: 0.5...2.0, step: 0.25).tint(DesignTokens.Primary.default)
                }.padding(DesignTokens.Spacing.md)
            }
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func liveBufferSection(_ vm: PlaybackSettingsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            settingsSectionLabel(localization.t("settings.playback.liveTV"))
            GlassCard {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    HStack {
                        Text(localization.t("settings.playback.bufferSize"))
                            .font(.system(size: DesignTokens.FontSize.md)).foregroundStyle(DesignTokens.Text.primary)
                        Spacer()
                        Text("\(vm.liveBufferSeconds)s")
                            .font(.system(size: DesignTokens.FontSize.sm)).foregroundStyle(DesignTokens.Text.muted).monospacedDigit()
                    }
                    Slider(value: Binding(get: { Double(vm.liveBufferSeconds) },
                                          set: { vm.liveBufferSeconds = Int($0) }),
                           in: 10...120, step: 10).tint(DesignTokens.Primary.default)
                }.padding(DesignTokens.Spacing.md)
            }
        }.padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
