import BayitDesignSystem
import BayitLocalization
import CoreImage.CIFilterBuiltins
import SwiftUI

// MARK: - Device Row & Helpers

extension DevicePairingView {
    func deviceRow(
        _ device: PairedDevice,
        viewModel vm: DevicePairingViewModel
    ) -> some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: deviceIcon(device.type))
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .frame(width: 32)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(device.name ?? localization.t("pairing.unknownDevice"))
                        .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)

                    if let platform = device.platform {
                        Text(platform)
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }

                Spacer()

                Button {
                    HapticFeedbackService.notification(type: .warning)
                    Task { await vm.removeDevice(device) }
                } label: {
                    Image(systemName: "trash")
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func deviceIcon(_ type: String?) -> String {
        switch type?.lowercased() {
        case "tv", "tvos": return "tv"
        case "phone", "mobile", "ios": return "iphone"
        case "tablet", "ipad": return "ipad"
        default: return "desktopcomputer"
        }
    }

    func qrCodeImage(for string: String) -> Image {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        filter.correctionLevel = "M"

        guard let outputImage = filter.outputImage else {
            return Image(systemName: "qrcode")
        }

        let transform = CGAffineTransform(scaleX: 10, y: 10)
        let scaledImage = outputImage.transformed(by: transform)

        guard let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) else {
            return Image(systemName: "qrcode")
        }

        return Image(uiImage: UIImage(cgImage: cgImage))
    }
}
