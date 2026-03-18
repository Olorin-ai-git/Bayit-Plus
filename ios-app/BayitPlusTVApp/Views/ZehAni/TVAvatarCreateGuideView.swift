#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import BayitNetworking
    import CoreImage.CIFilterBuiltins
    import SwiftUI
    import UIKit

    struct TVAvatarCreateGuideView: View {
        @Environment(LocalizationManager.self) var localization
        @Environment(\.dismiss) private var dismiss

        let apiClient: APIClient
        let profileId: String
        var onAvatarCreated: (() -> Void)?

        @State private var viewModel: TVAvatarPairingViewModel?

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()
                contentView
            }
            .task {
                if viewModel == nil {
                    let vm = TVAvatarPairingViewModel(
                        apiClient: apiClient, profileId: profileId
                    )
                    viewModel = vm
                    await vm.startSession()
                }
            }
            .onChange(of: viewModel?.status) { _, newValue in
                if case .completed = newValue {
                    onAvatarCreated?()
                    dismiss()
                }
            }
            .onDisappear { viewModel?.cleanup() }
        }

        @ViewBuilder
        private var contentView: some View {
            if let vm = viewModel {
                statusContent(vm)
            } else {
                ProgressView().tint(.white).scaleEffect(1.5)
            }
        }

        @ViewBuilder
        private func statusContent(_ vm: TVAvatarPairingViewModel) -> some View {
            switch vm.status {
            case .loading:
                ProgressView().tint(.white).scaleEffect(1.5)
            case .showingQR:
                qrCodeSection(vm)
            case .phoneConnected:
                phoneConnectedSection
            case .creating:
                creatingSection
            case .completed:
                completedSection
            case .expired:
                expiredSection(vm)
            case let .error(message):
                errorSection(vm, message: message)
            }
        }

        private func qrCodeSection(_ vm: TVAvatarPairingViewModel) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.xxl) {
                Text(localization.t("zehAni.pairing.scanTitle"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.xxl, weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                if let code = vm.qrCodeData {
                    qrCodeImage(for: code)
                        .interpolation(.none)
                        .resizable()
                        .scaledToFit()
                        .frame(
                            width: TVDesignTokens.QRCode.size * 1.3,
                            height: TVDesignTokens.QRCode.size * 1.3
                        )
                        .clipShape(RoundedRectangle(
                            cornerRadius: TVDesignTokens.Radius.lg
                        ))
                        .background(
                            RoundedRectangle(
                                cornerRadius: TVDesignTokens.Radius.lg
                            )
                            .fill(.white)
                            .padding(-TVDesignTokens.Spacing.md)
                        )
                        .shadow(
                            color: DesignTokens.Colors.Primary.base.opacity(0.3),
                            radius: 20, x: 0, y: 10
                        )
                }

                Text(localization.t("zehAni.pairing.scanSubtitle"))
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)

                if let code = vm.pairingCode {
                    pairingCodeLabel(code)
                }

                dismissButton
            }
            .frame(maxWidth: 700)
            .padding(TVDesignTokens.Spacing.xxl)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }

        private func pairingCodeLabel(_ code: String) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Text(localization.t("zehAni.pairing.codeLabel"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(code)
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold, design: .monospaced))
                    .foregroundStyle(DesignTokens.Primary.p400)
                    .tracking(8)
            }
            .padding(TVDesignTokens.Spacing.md)
            .background(DesignTokens.Primary.p400.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
        }

        private var phoneConnectedSection: some View {
            GlassCard(
                radius: TVDesignTokens.Radius.lg,
                padding: TVDesignTokens.Spacing.xl
            ) {
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    Image(systemName: "iphone.and.arrow.forward")
                        .font(.system(size: TVDesignTokens.FontSize.display))
                        .foregroundStyle(DesignTokens.Primary.p400)
                        .symbolEffect(.pulse)
                    Text(localization.t("zehAni.pairing.phoneConnected"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.lg, weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                    Text(localization.t("zehAni.pairing.creatingAvatar"))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
        }

        private var creatingSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                ProgressView().tint(.white).scaleEffect(1.5)
                Text(localization.t("zehAni.pairing.creatingAvatar"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg, weight: .medium
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }

        private var completedSection: some View {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: TVDesignTokens.FontSize.hero))
                    .foregroundStyle(DesignTokens.Colors.Semantic.success)
                Text(localization.t("zehAni.pairing.completed"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg, weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }

        private func expiredSection(_ vm: TVAvatarPairingViewModel) -> some View {
            GlassCard(
                radius: TVDesignTokens.Radius.lg,
                padding: TVDesignTokens.Spacing.xl
            ) {
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    Image(systemName: "clock.badge.exclamationmark")
                        .font(.system(size: TVDesignTokens.FontSize.display))
                        .foregroundStyle(DesignTokens.Colors.Semantic.warning)
                    Text(localization.t("zehAni.pairing.expired"))
                        .font(.system(
                            size: TVDesignTokens.FontSize.lg, weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                    GlassButton(
                        localization.t("zehAni.pairing.retryButton"),
                        variant: .primary, size: .large,
                        icon: Image(systemName: "qrcode")
                    ) {
                        Task { await vm.retry() }
                    }
                }
            }
        }

        private func errorSection(
            _ vm: TVAvatarPairingViewModel, message: String
        ) -> some View {
            GlassCard(
                radius: TVDesignTokens.Radius.lg,
                padding: TVDesignTokens.Spacing.xl
            ) {
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: TVDesignTokens.FontSize.display))
                        .foregroundStyle(DesignTokens.Colors.Semantic.error)
                    Text(message)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .multilineTextAlignment(.center)
                    GlassButton(
                        localization.t("zehAni.pairing.retryButton"),
                        variant: .primary, size: .large,
                        icon: Image(systemName: "arrow.clockwise")
                    ) {
                        Task { await vm.retry() }
                    }
                }
            }
        }

        private var dismissButton: some View {
            Button { dismiss() } label: {
                Text(localization.t("common.cancel"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.base, weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .tvCardStyle()
        }

        private func qrCodeImage(for string: String) -> Image {
            let context = CIContext()
            let filter = CIFilter.qrCodeGenerator()
            filter.message = Data(string.utf8)
            filter.correctionLevel = "M"

            guard let outputImage = filter.outputImage else {
                return Image(systemName: "qrcode")
            }

            let transform = CGAffineTransform(scaleX: 10, y: 10)
            let scaledImage = outputImage.transformed(by: transform)

            guard let cgImage = context.createCGImage(
                scaledImage, from: scaledImage.extent
            ) else {
                return Image(systemName: "qrcode")
            }

            return Image(uiImage: UIImage(cgImage: cgImage))
        }
    }
#endif
