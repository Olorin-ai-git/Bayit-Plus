import BayitDesignSystem
import SwiftUI
import UIKit

/// Controls panel for live dubbing within the player - toggle button,
/// language picker from supported languages, and latency badge.
struct LiveDubbingControlsView: View {
    @Bindable var viewModel: LiveDubbingViewModel
    let channelId: String

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            HStack(spacing: DesignTokens.Spacing.md) {
                dubbingToggle
                languagePicker
                Spacer()
                latencyBadge
            }
        }
        .task {
            await viewModel.checkAvailability(channelId: channelId)
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

    // MARK: - Latency Badge

    @ViewBuilder
    private var latencyBadge: some View {
        if let latency = viewModel.webSocketService.latency,
           let totalMs = latency.avgTotalMs {
            let variant: GlassBadge.Variant = totalMs < 500 ? .success : .warning
            GlassBadge(
                text: "\(Int(totalMs))ms",
                variant: variant
            )
            .accessibilityLabel("Dubbing latency: \(Int(totalMs)) milliseconds")
        }
    }
}
