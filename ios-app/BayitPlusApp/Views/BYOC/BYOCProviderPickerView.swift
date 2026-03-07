import BayitBYOC
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Provider picker with known IPTV providers and manual entry option.
struct BYOCProviderPickerView: View {
    @Environment(LocalizationManager.self) private var localization

    let providers: [BYOCProviderInfo]
    let onSelectProvider: (BYOCProviderInfo?) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("byoc.selectProvider"))
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(providers) { provider in
                        providerCard(provider)
                    }
                    manualEntryCard
                }
                .padding(.horizontal, DesignTokens.Spacing.sm)
            }
        }
    }

    private func providerCard(
        _ provider: BYOCProviderInfo
    ) -> some View {
        Button {
            onSelectProvider(provider)
        } label: {
            VStack(spacing: DesignTokens.Spacing.sm) {
                if let logoUrl = provider.logoUrl,
                   let url = URL(string: logoUrl)
                {
                    AsyncImage(url: url) { image in
                        image.resizable().scaledToFit()
                    } placeholder: {
                        providerInitials(provider.name)
                    }
                    .frame(width: 48, height: 48)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                } else {
                    providerInitials(provider.name)
                }

                Text(provider.name)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                connectionBadge(provider)
            }
            .frame(width: 100, height: 120)
            .background(DesignTokens.Background.elevated)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }

    private var manualEntryCard: some View {
        Button {
            onSelectProvider(nil)
        } label: {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "plus.circle")
                    .font(.system(size: 32))
                    .foregroundStyle(DesignTokens.Text.secondary)

                Text(localization.t("byoc.manualEntry"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(1)
            }
            .frame(width: 100, height: 120)
            .background(DesignTokens.Background.elevated.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(
                        DesignTokens.Text.secondary.opacity(0.3),
                        style: StrokeStyle(lineWidth: 1, dash: [6])
                    )
            )
        }
        .buttonStyle(.plain)
    }

    private func providerInitials(_ name: String) -> some View {
        let initials = name.split(separator: " ")
            .prefix(2)
            .compactMap(\.first)
            .map(String.init)
            .joined()
        return Text(initials.uppercased())
            .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 48, height: 48)
            .background(DesignTokens.Primary.default)
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func connectionBadge(_ provider: BYOCProviderInfo) -> some View {
        let hasXtream = provider.connectionTypes.contains("xtream")
        let label = hasXtream ? "Xtream" : "M3U"
        return Text(label)
            .font(.system(size: DesignTokens.FontSize.xs))
            .foregroundStyle(DesignTokens.Text.secondary)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(DesignTokens.Background.elevated)
            .clipShape(Capsule())
    }
}
