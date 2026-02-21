#if os(tvOS)
    import BayitDesignSystem
    import SwiftUI

    // MARK: - Content Picker Card

    struct TVContentPickerCard: View {
        let item: ContentPickerItem
        let onSelect: () -> Void

        @Environment(\.isFocused) private var isFocused

        var body: some View {
            Button(action: onSelect) {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    thumbnailView
                        .frame(width: 120, height: 120)
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))

                    Text(item.title)
                        .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)

                    if let subtitle = item.subtitle {
                        Text(subtitle)
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }
                .padding(TVDesignTokens.Spacing.lg)
                .frame(maxWidth: .infinity)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card))
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.card)
                        .stroke(
                            isFocused ? DesignTokens.Glass.borderFocus : DesignTokens.Glass.border,
                            lineWidth: isFocused ? TVDesignTokens.Focus.ringWidth : 1
                        )
                )
            }
            .buttonStyle(TVContentPickerCardStyle())
        }

        private var thumbnailView: some View {
            Group {
                if let url = item.thumbnailURL {
                    CachedAsyncImage(url: url) { phase in
                        if case let .success(img) = phase {
                            img.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            placeholderIcon
                        }
                    }
                } else {
                    placeholderIcon
                }
            }
        }

        private var placeholderIcon: some View {
            ZStack {
                DesignTokens.Glass.purpleLight
                Image(systemName: item.tab.iconName)
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }

    struct TVContentPickerCardStyle: ButtonStyle {
        @Environment(\.isFocused) private var isFocused

        func makeBody(configuration: Configuration) -> some View {
            configuration.label
                .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
                .shadow(
                    color: isFocused ? DesignTokens.Glass.purpleGlow.opacity(0.5) : .clear,
                    radius: TVDesignTokens.Focus.shadowRadius,
                    x: 0, y: isFocused ? 8 : 0
                )
                .animation(
                    .spring(duration: TVDesignTokens.Focus.animationDuration, bounce: 0.2),
                    value: isFocused
                )
        }
    }
#endif
