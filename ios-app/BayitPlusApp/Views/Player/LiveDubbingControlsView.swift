import BayitDesignSystem
import SwiftUI
import UIKit

/// Controls panel for live dubbing - toggle, voice selector, language picker, sync delay, and quality indicators.
/// Includes premium subscription gate for non-premium users.
struct LiveDubbingControlsView: View {
    @Bindable var viewModel: LiveDubbingViewModel
    let channelId: String

    @State private var showVoiceSelector = false
    @State private var showPremiumGate = false

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if viewModel.isPremiumRequired {
                premiumGateView
            } else {
                controlsRow
            }
        }
        .task {
            await viewModel.checkAvailability(channelId: channelId)
        }
        .sheet(isPresented: $showVoiceSelector) {
            VoiceSelectorView(
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
        .padding(DesignTokens.Spacing.md)
    }

    // MARK: - Controls Row

    private var controlsRow: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            dubbingToggle

            if viewModel.isEnabled || viewModel.availability?.isAvailable == true {
                voiceSelectorButton
            }

            languagePicker

            Spacer()

            if viewModel.isEnabled {
                syncDelayBadge
                qualityTierBadge
            }
        }
    }

    // MARK: - Toggle

    private var dubbingToggle: some View {
        GlassButton(
            viewModel.isEnabled ? "Dubbing On" : "Dubbing Off",
            variant: viewModel.isEnabled ? .primary : .secondary,
            size: .small,
            isDisabled: viewModel.availability?.isAvailable != true,
            icon: Image(systemName: viewModel.isEnabled
                ? "captions.bubble.fill"
                : "captions.bubble")
        ) {
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            viewModel.toggleDubbing(channelId: channelId)
        }
        .accessibilityLabel("Live dubbing")
        .accessibilityValue(viewModel.isEnabled ? "Enabled" : "Disabled")
        .accessibilityHint("Double tap to toggle live dubbing")
    }

    // MARK: - Voice Selector Button

    private var voiceSelectorButton: some View {
        Button {
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            showVoiceSelector = true
        } label: {
            HStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: "waveform")
                    .font(.system(size: 14))

                if let voice = viewModel.selectedVoice {
                    Text(voice.name)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .lineLimit(1)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background(DesignTokens.Glass.bg)
            .cornerRadius(DesignTokens.Radius.sm)
            .foregroundStyle(DesignTokens.Text.primary)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Select dubbing voice")
        .accessibilityValue(viewModel.selectedVoice?.name ?? "None")
    }

    // MARK: - Language Picker

    @ViewBuilder
    private var languagePicker: some View {
        if let languages = viewModel.availability?.supportedLanguages,
           !languages.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(languages, id: \.self) { language in
                        GlassChip(
                            title: language.uppercased(),
                            isSelected: viewModel.selectedLanguage == language
                        ) {
                            let generator = UIImpactFeedbackGenerator(style: .light)
                            generator.impactOccurred()
                            viewModel.selectLanguage(language, channelId: channelId)
                        }
                        .accessibilityLabel("Language: \(language)")
                        .accessibilityAddTraits(
                            viewModel.selectedLanguage == language
                                ? .isSelected : []
                        )
                    }
                }
            }
        }
    }

    // MARK: - Sync Delay Badge

    @ViewBuilder
    private var syncDelayBadge: some View {
        if viewModel.syncDelayMs > 0 {
            GlassBadge(
                text: "Sync: \(viewModel.syncDelayMs)ms",
                variant: .info
            )
            .accessibilityLabel("Sync delay: \(viewModel.syncDelayMs) milliseconds")
        }
    }

    // MARK: - Quality Tier Badge

    @ViewBuilder
    private var qualityTierBadge: some View {
        if let tier = viewModel.qualityTier {
            let variant: GlassBadge.Variant = {
                switch tier {
                case .standard: return .primary
                case .premium: return .info
                case .ultra: return .success
                }
            }()

            GlassBadge(
                text: tier.displayName,
                variant: variant
            )
            .accessibilityLabel("Quality: \(tier.displayName)")
        }
    }
}
