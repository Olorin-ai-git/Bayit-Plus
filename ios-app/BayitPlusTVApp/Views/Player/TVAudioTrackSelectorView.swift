import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS audio track selector: vertical list of focusable track rows with radio-button selection.
/// Dismiss via Menu button on the Siri Remote (no X button).
/// Uses AudioTrack from the shared module.
struct TVAudioTrackSelectorView: View {
    @Environment(LocalizationManager.self) private var localization
    let tracks: [AudioTrack]
    @Binding var selectedTrackId: String?
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("player.audioTrack"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.top, TVDesignTokens.Spacing.lg)

            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: TVDesignTokens.Spacing.sm) {
                    ForEach(tracks) { track in
                        trackRow(track)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.bottom, TVDesignTokens.Spacing.xl)
            }
        }
        .background(DesignTokens.Background.primary)
        .onExitCommand { onDismiss() }
    }

    // MARK: - Track Row

    private func trackRow(_ track: AudioTrack) -> some View {
        let isSelected = selectedTrackId == track.id

        return Button {
            selectedTrackId = track.id
        } label: {
            GlassCard {
                HStack {
                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                        Text(track.label)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundColor(DesignTokens.Text.primary)

                        if let language = track.language {
                            Text(language)
                                .font(.system(size: TVDesignTokens.FontSize.xs))
                                .foregroundColor(DesignTokens.Text.muted)
                        }
                    }

                    Spacer()

                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 30))
                        .foregroundColor(
                            isSelected ? DesignTokens.Primary.default : DesignTokens.Text.muted
                        )
                }
                .padding(TVDesignTokens.Spacing.md)
            }
        }
        .tvCardStyle()
        .accessibilityLabel("\(track.label)\(isSelected ? ", selected" : "")")
    }
}
