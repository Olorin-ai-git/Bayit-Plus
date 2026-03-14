import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Download settings: quality preference and cellular toggle.
struct DownloadSettingsView: View {
    @Environment(DownloadManager.self) private var downloadManager
    @Environment(LocalizationManager.self) private var localization
    @Environment(NetworkMonitor.self) private var networkMonitor
    @AppStorage("downloadQuality") private var quality: String = DownloadQualitySetting.hd.rawValue
    @AppStorage("downloadOverCellular") private var allowCellular: Bool = false

    var body: some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.lg) {
                qualitySection
                networkSection
                storageSection
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
        .navigationTitle(localization.t("settings.downloads.title"))
    }

    // MARK: - Quality

    private var qualitySection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.downloads.quality"))
            ForEach(DownloadQualitySetting.allCases, id: \.self) { option in
                qualityRow(option)
            }
        }
    }

    private func qualityRow(_ option: DownloadQualitySetting) -> some View {
        GlassCard {
            Button {
                quality = option.rawValue
            } label: {
                HStack(spacing: DesignTokens.Spacing.md) {
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                        Text(option.displayName(localization))
                            .font(.system(size: DesignTokens.FontSize.md, weight: .medium))
                            .foregroundColor(DesignTokens.Text.primary)
                        Text(option.sizeHint(localization))
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                    Spacer()
                    if quality == option.rawValue {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(DesignTokens.Primary.default)
                    }
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
    }

    // MARK: - Network

    private var networkSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionLabel(localization.t("settings.downloads.network"))
            GlassCard {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .font(.system(size: DesignTokens.FontSize.lg))
                        .foregroundColor(DesignTokens.Primary.default)
                        .frame(width: 32)
                    Text(localization.t("settings.downloads.allowCellular"))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.primary)
                    Spacer()
                    Toggle("", isOn: $allowCellular)
                        .tint(DesignTokens.Primary.default)
                        .labelsHidden()
                }
                .padding(DesignTokens.Spacing.md)
            }
        }
    }

    // MARK: - Storage

    private var storageSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            sectionLabel(localization.t("downloads.storageUsed"))
            GlassCard {
                HStack {
                    Text(localization.t("downloads.storage"))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.primary)
                    Spacer()
                    Text(DownloadManager.formatBytes(downloadManager.totalDownloadedSize))
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.secondary)
                }
                .padding(DesignTokens.Spacing.md)
            }
            if downloadManager.isStorageLow {
                HStack(spacing: DesignTokens.Spacing.xs) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(DesignTokens.Warning.default)
                    Text(localization.t("downloads.storageLow"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Warning.default)
                }
            }
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
            .foregroundColor(DesignTokens.Text.muted)
            .textCase(.uppercase)
    }
}

// MARK: - Quality Setting

enum DownloadQualitySetting: String, CaseIterable {
    case sd
    case hd
    case fhd

    func displayName(_ l: LocalizationManager) -> String {
        switch self {
        case .sd: return l.t("settings.downloads.qualitySd")
        case .hd: return l.t("settings.downloads.qualityHd")
        case .fhd: return l.t("settings.downloads.qualityFhd")
        }
    }

    func sizeHint(_ l: LocalizationManager) -> String {
        switch self {
        case .sd: return l.t("settings.downloads.sizeHintSd")
        case .hd: return l.t("settings.downloads.sizeHintHd")
        case .fhd: return l.t("settings.downloads.sizeHintFhd")
        }
    }

    var mbPerMinute: Double {
        switch self {
        case .sd: return 25.0
        case .hd: return 50.0
        case .fhd: return 83.0
        }
    }
}
