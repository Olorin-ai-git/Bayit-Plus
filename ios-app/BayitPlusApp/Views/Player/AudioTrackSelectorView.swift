import BayitDesignSystem
import SwiftUI
#if os(iOS)
import UIKit
#endif

/// Sheet-presented list of available audio tracks with radio-button selection
struct AudioTrackSelectorView: View {
    let tracks: [AudioTrack]
    @Binding var selectedTrackId: String?
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            HStack {
                Text("Audio Track")
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)

                Spacer()

                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 22))
                        .foregroundColor(DesignTokens.Text.muted)
                }
                .accessibilityLabel("Dismiss audio track selector")
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.top, DesignTokens.Spacing.lg)

            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(tracks) { track in
                        trackRow(track)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.bottom, DesignTokens.Spacing.xl)
            }
        }
        .background(DesignTokens.Background.primary)
    }

    private func trackRow(_ track: AudioTrack) -> some View {
        let isSelected = selectedTrackId == track.id

        return Button {
            #if os(iOS)
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
            #endif
            selectedTrackId = track.id
        } label: {
            GlassCard {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(track.label)
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundColor(DesignTokens.Text.primary)

                        if let language = track.language {
                            Text(language)
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundColor(DesignTokens.Text.muted)
                        }
                    }

                    Spacer()

                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 22))
                        .foregroundColor(
                            isSelected ? DesignTokens.Primary.default : DesignTokens.Text.muted
                        )
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
        .buttonStyle(.plain)
    }
}
