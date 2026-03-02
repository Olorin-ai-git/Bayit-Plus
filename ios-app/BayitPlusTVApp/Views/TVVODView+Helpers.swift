import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - VOD Helper Methods

extension TVVODView {
    func vodSubtitle(for item: ContentItem) -> String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    func badgeText(for item: ContentItem) -> String? {
        let movies = localization.t("vod.collection.movies")
        let of = localization.t("vod.collection.of")
        if item.isCollectionParent == true {
            if let available = item.availableMovies, let total = item.totalMovies, total > available {
                return "\(available) \(of) \(total) \(movies)"
            } else if let available = item.availableMovies {
                return "\(available) \(movies)"
            }
            return localization.t("home.collection")
        } else if item.type?.lowercased() == "series" {
            return localization.t("vod.series")
        }
        return nil
    }
}

/// tvOS filter pill with focus support
struct TVFilterPill: View {
    let title: String
    let isSelected: Bool
    let onTap: () -> Void

    @FocusState private var isFocused: Bool

    var body: some View {
        Button(action: onTap) {
            Text(title)
                .font(.system(
                    size: TVDesignTokens.FontSize.lg,
                    weight: isSelected ? .bold : .medium
                ))
                .foregroundColor(
                    isSelected ? DesignTokens.Text.primary : DesignTokens.Text.muted
                )
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(
                    isSelected ? DesignTokens.Glass.bgStrong : DesignTokens.Glass.bg
                )
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(
                        isFocused
                            ? DesignTokens.Glass.borderFocus
                            : Color.clear,
                        lineWidth: TVDesignTokens.Focus.ringWidth
                    )
                )
                .shadow(
                    color: isFocused
                        ? DesignTokens.Glass.purpleGlow : .clear,
                    radius: TVDesignTokens.Focus.shadowRadius,
                    x: 0, y: isFocused ? 4 : 0
                )
                .scaleEffect(
                    isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0
                )
                .animation(
                    .spring(
                        duration: TVDesignTokens.Focus.animationDuration,
                        bounce: 0.2
                    ),
                    value: isFocused
                )
        }
        .buttonStyle(.plain)
        .focusEffectDisabled()
        .focused($isFocused)
    }
}
