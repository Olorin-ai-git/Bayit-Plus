import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS wake word settings view. Informational only — wake word not functional on Apple TV.
struct TVWakeWordSettingsView: View {
    @Environment(LocalizationManager.self) private var localization
    @State private var sensitivity: Double = 0.5

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                headerSection
                infoSection
                sensitivityDisplaySection
                statusSection
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.xxl)
        }
        .background(DesignTokens.Background.primary)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ZStack {
                Circle()
                    .fill(DesignTokens.Glass.purpleLight)
                    .frame(width: 120, height: 120)

                Image(systemName: "waveform.badge.mic")
                    .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }

            Text(localization.t("voice.heyBayit"))
                .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("voice.wakeWordDescription"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Info

    private var infoSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "info.circle")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Primary.p400)

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(localization.t("voice.appleTVLimitation"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("voice.appleTVLimitationDescription"))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                Spacer()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }

    // MARK: - Sensitivity Display

    private var sensitivityDisplaySection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack {
                Text(localization.t("voice.sensitivity"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                Text(sensitivityLabel)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(DesignTokens.Glass.bgMedium)
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(DesignTokens.Primary.default)
                        .frame(width: geo.size.width * sensitivity, height: 8)
                }
            }
            .frame(height: 8)

            HStack {
                Text(localization.t("voice.low"))
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.disabled)
                Spacer()
                Text(localization.t("voice.high"))
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.disabled)
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .opacity(0.5)
    }

    // MARK: - Status

    private var statusSection: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Circle()
                .fill(DesignTokens.Text.disabled)
                .frame(width: 16, height: 16)

            Text(localization.t("voice.notAvailableOnAppleTV"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)

            Spacer()
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    // MARK: - Computed

    private var sensitivityLabel: String {
        if sensitivity < 0.33 { return "Low" }
        if sensitivity < 0.66 { return "Medium" }
        return "High"
    }
}
