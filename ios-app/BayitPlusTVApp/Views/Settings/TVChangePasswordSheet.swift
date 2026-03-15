#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVChangePasswordSheet: View {
        let viewModel: SecurityViewModel?
        let onDismiss: () -> Void

        @Environment(LocalizationManager.self) private var localization

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()
                VStack(spacing: 0) {
                    TVProfileSheetHeader(
                        title: localization.t("profile.changePassword"),
                        onDismiss: onDismiss
                    )
                    Spacer()
                    VStack(spacing: 28) {
                        Image(systemName: "key.fill")
                            .font(.system(size: 56))
                            .foregroundStyle(DesignTokens.Primary.p400)

                        if let error = viewModel?.error {
                            Text(error)
                                .font(.system(size: 22))
                                .foregroundStyle(DesignTokens.ErrorColor.default)
                                .multilineTextAlignment(.center)
                        }

                        if let success = viewModel?.successMessage {
                            Text(success)
                                .font(.system(size: 22))
                                .foregroundStyle(.green)
                                .multilineTextAlignment(.center)
                        }

                        VStack(spacing: 16) {
                            passwordField(
                                label: localization.t("settings.security.currentPassword"),
                                text: Binding(
                                    get: { viewModel?.currentPassword ?? "" },
                                    set: { viewModel?.currentPassword = $0 }
                                )
                            )
                            passwordField(
                                label: localization.t("settings.security.newPassword"),
                                text: Binding(
                                    get: { viewModel?.newPassword ?? "" },
                                    set: { viewModel?.newPassword = $0 }
                                )
                            )
                            passwordField(
                                label: localization.t("settings.security.confirmPassword"),
                                text: Binding(
                                    get: { viewModel?.confirmPassword ?? "" },
                                    set: { viewModel?.confirmPassword = $0 }
                                )
                            )
                        }
                        .frame(maxWidth: 640)

                        Button {
                            Task { await viewModel?.changePassword() }
                        } label: {
                            Group {
                                if viewModel?.isProcessing == true {
                                    ProgressView().progressViewStyle(.circular).tint(.white)
                                } else {
                                    Text(localization.t("settings.security.changePassword"))
                                        .font(.system(size: 28, weight: .semibold))
                                        .foregroundStyle(.white)
                                }
                            }
                            .frame(width: 380, height: 72)
                            .background(DesignTokens.Primary.p400)
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        }
                        .tvCardStyle()
                        .disabled(!(viewModel?.passwordsValid ?? false) || viewModel?.isProcessing == true)
                    }
                    Spacer()
                }
            }
            .preferredColorScheme(.dark)
            .onExitCommand { onDismiss() }
        }

        private func passwordField(label: String, text: Binding<String>) -> some View {
            SecureField(label, text: text)
                .font(.system(size: 26))
                .foregroundColor(.white)
                .padding(.horizontal, 28)
                .padding(.vertical, 20)
                .background(Color.white.opacity(0.07))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }
#endif
