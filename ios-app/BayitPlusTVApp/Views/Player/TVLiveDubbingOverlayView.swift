import BayitDesignSystem
import SwiftUI

/// tvOS live dubbing controls panel -- toggle, voice selector, language chips,
/// sync delay and quality badges. Laid out vertically for Siri Remote navigation
/// with generous focus gaps between all interactive elements.
struct TVLiveDubbingOverlayView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: LiveDubbingViewModel
    let channelId: String

    @State private var showVoiceSelector = false
    @State private var showPremiumGate = false

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            if viewModel.isPremiumRequired {
                premiumGateView
            } else {
                controlsColumn
            }
        }
        .onExitCommand { dismiss() }
        .task {
            await viewModel.checkAvailability(channelId: channelId)
        }
        .fullScreenCover(isPresented: $showVoiceSelector) {
            TVVoiceSelectorView(
                voices: viewModel.voices,
                selectedVoice: viewModel.selectedVoice,
                onSelect: { voice in
                    viewModel.selectVoice(voice, channelId: channelId)
                }
            )
        }
        .onChange(of: viewModel.isPremiumRequired) { _, required in
            showPremiumGate = required
        }
        .onChange(of: viewModel.webSocketService.connectionInfo) { _, info in
            if let info = info {
                viewModel.handleConnectionInfo(info)
            }
        }
    }

    // MARK: - Premium Gate

    private var premiumGateView: some View {
        DubbingPremiumGateView {
            viewModel.dismissPremiumGate()
        }
        .padding(TVDesignTokens.Spacing.md)
    }

    // MARK: - Controls Column

    private var controlsColumn: some View {
        VStack(spacing: TVDesignTokens.Spacing.focusGap) {
            dubbingToggle

            if viewModel.isEnabled || viewModel.availability?.isAvailable == true {
                voiceSelectorButton
            }

            languagePicker

            if viewModel.isEnabled {
                audioMixerSection
                statusBadges
            }
        }
    }

    // MARK: - Audio Mixer

    private var audioMixerSection: some View {
        TVDubbingMixerView(
            balance: Binding(
                get: { viewModel.dubbedVolume / (viewModel.originalVolume + viewModel.dubbedVolume) },
                set: { newBalance in
                    viewModel.dubbedVolume = newBalance
                    viewModel.originalVolume = 1.0 - newBalance
                }
            ),
            isActive: viewModel.isEnabled
        )
    }

    // MARK: - Toggle

    private var dubbingToggle: some View {
        GlassButton(
            viewModel.isEnabled ? "Dubbing On" : "Dubbing Off",
            variant: viewModel.isEnabled ? .primary : .secondary,
            size: .medium,
            isDisabled: viewModel.availability?.isAvailable != true,
            icon: Image(systemName: viewModel.isEnabled
                ? "captions.bubble.fill"
                : "captions.bubble")
        ) {
            viewModel.toggleDubbing(channelId: channelId)
        }
        .accessibilityLabel("Live dubbing")
        .accessibilityValue(viewModel.isEnabled ? "Enabled" : "Disabled")
        .accessibilityHint("Press select to toggle live dubbing")
    }

    // MARK: - Voice Selector Button

    private var voiceSelectorButton: some View {
        Button {
            showVoiceSelector = true
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "waveform")
                    .font(.system(size: TVDesignTokens.FontSize.md))

                if let voice = viewModel.selectedVoice {
                    Text(voice.name)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .lineLimit(1)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .frame(minWidth: TVDesignTokens.MinSize.focusableWidth,
                   minHeight: TVDesignTokens.MinSize.focusableHeight)
            .background(DesignTokens.Glass.bg)
            .cornerRadius(TVDesignTokens.Radius.md)
            .foregroundStyle(DesignTokens.Text.primary)
        }
        .tvCardStyle()
        .accessibilityLabel("Select dubbing voice")
        .accessibilityValue(viewModel.selectedVoice?.name ?? "None")
    }

    // MARK: - Language Picker

    @ViewBuilder
    private var languagePicker: some View {
        if let languages = viewModel.availability?.supportedLanguages,
           !languages.isEmpty
        {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(languages, id: \.self) { language in
                        GlassChip(
                            title: language.uppercased(),
                            isSelected: viewModel.selectedLanguage == language
                        ) {
                            viewModel.selectLanguage(language, channelId: channelId)
                        }
                        .focusable()
                        .tvFocusStyle()
                        .accessibilityLabel("Language: \(language)")
                        .accessibilityAddTraits(
                            viewModel.selectedLanguage == language
                                ? .isSelected : []
                        )
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.sm)
            }
        }
    }

    // MARK: - Status Badges

    private var statusBadges: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            if viewModel.syncDelayMs > 0 {
                GlassBadge(text: "Sync: \(viewModel.syncDelayMs)ms", variant: .info)
            }
            if let tier = viewModel.qualityTier {
                GlassBadge(
                    text: tier.displayName,
                    variant: tier == .ultra ? .success : (tier == .premium ? .info : .primary)
                )
            }
        }
    }
}
