import BayitDesignSystem
import BayitLocalization
import CoreImage.CIFilterBuiltins
import SwiftUI

/// Device pairing screen with QR code display, manual code entry,
/// and paired device management.
struct DevicePairingView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) var localization
    @State private var viewModel: DevicePairingViewModel?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && vm.devices.isEmpty && vm.pairingCode == nil {
                        ProgressView().tint(.white)
                            .padding(.top, DesignTokens.Spacing.xxxxl)
                    } else if let error = vm.error,
                              vm.devices.isEmpty, vm.pairingCode == nil
                    {
                        ErrorStateView(message: error) {
                            Task { await vm.load() }
                        }
                    } else {
                        qrCodeSection(vm)
                        manualEntrySection(vm)
                        devicesSection(vm)
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = DevicePairingViewModel(repository: repos.devicePairing)
            }
            await viewModel?.generateCode()
            await viewModel?.load()
        }
    }

    // MARK: - QR Code

    private func qrCodeSection(_ vm: DevicePairingViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Text(localization.t("pairing.scanCode"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                if let code = vm.pairingCode?.code {
                    qrCodeImage(for: code)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 200, height: 200)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                        .padding(DesignTokens.Spacing.sm)

                    Text(code)
                        .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.p400)
                        .kerning(4)
                } else if vm.isGenerating {
                    ProgressView().tint(.white)
                        .frame(width: 200, height: 200)
                }

                if let expiresAt = vm.pairingCode?.expiresAt {
                    Text("\(localization.t("pairing.expiresAt")) \(expiresAt)")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                GlassButton(
                    localization.t("pairing.regenerate"),
                    variant: .secondary,
                    size: .small,
                    isLoading: vm.isGenerating
                ) {
                    HapticFeedbackService.impact(style: .light)
                    Task { await vm.generateCode() }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Manual Entry

    private func manualEntrySection(_ vm: DevicePairingViewModel) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Text(localization.t("pairing.enterCode"))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                GlassTextField(
                    localization.t("pairing.codePlaceholder"),
                    text: Binding(
                        get: { vm.manualCodeInput },
                        set: { vm.manualCodeInput = $0 }
                    )
                )

                GlassButton(
                    localization.t("pairing.verify"),
                    variant: .primary,
                    isLoading: vm.isVerifying
                ) {
                    HapticFeedbackService.impact(style: .medium)
                    Task { await vm.verifyCode() }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Paired Devices

    private func devicesSection(_ vm: DevicePairingViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text(localization.t("pairing.pairedDevices"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .textCase(.uppercase)
                Spacer()
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            if vm.devices.isEmpty {
                GlassCard {
                    HStack {
                        Image(systemName: "desktopcomputer")
                            .font(.system(size: DesignTokens.FontSize.xl))
                            .foregroundStyle(DesignTokens.Text.muted)
                        Text(localization.t("pairing.noDevices"))
                            .font(.system(size: DesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.secondary)
                        Spacer()
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            } else {
                ForEach(vm.devices) { device in
                    deviceRow(device, viewModel: vm)
                }
            }
        }
    }
}
