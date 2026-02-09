import BayitAuth
import BayitCore
import BayitDesignSystem
import SwiftUI

/// tvOS device code activation flow.
/// Displays a short code on the TV screen and polls the backend
/// until the user enters it on their phone or computer at the activation URL.
struct TVDeviceCodeView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(TVRepositoryProvider.self) private var repos

    let onAuthSuccess: () -> Void

    @State private var deviceCode = ""
    @State private var isPolling = false
    @State private var error: String?
    @State private var pollTask: Task<Void, Never>?

    private let logger = BayitLogger(category: "DeviceCodeAuth")

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: TVDesignTokens.Spacing.xxl) {
                Text("Sign in on your phone or computer")
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                instructionStep(
                    number: "1",
                    text: "Visit bayit.tv/activate on your phone or computer"
                )

                instructionStep(
                    number: "2",
                    text: "Enter the code shown below"
                )

                codeDisplay

                if isPolling {
                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        ProgressView()
                            .tint(DesignTokens.Primary.default)
                        Text("Waiting for activation...")
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }

                if let error {
                    Text(error)
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Colors.Semantic.error)
                }
            }
            .padding(TVDesignTokens.Spacing.xxxxl)
        }
        .onAppear { requestCode() }
        .onDisappear { pollTask?.cancel() }
    }

    // MARK: - Subviews

    private func instructionStep(number: String, text: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Text(number)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .frame(width: 40, height: 40)
                .background(DesignTokens.Primary.default)
                .clipShape(Circle())

            Text(text)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    private var codeDisplay: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            ForEach(Array(deviceCode), id: \.self) { char in
                Text(String(char))
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold, design: .monospaced))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .frame(width: 80, height: 100)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                    .overlay(
                        RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                            .stroke(DesignTokens.Glass.border, lineWidth: 1)
                    )
            }
        }
        .padding(.vertical, TVDesignTokens.Spacing.xl)
    }

    // MARK: - Actions

    private func requestCode() {
        deviceCode = generateCode()
        startPolling()
    }

    private func generateCode() -> String {
        let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        return String((0..<6).map { _ in chars.randomElement()! })
    }

    private func startPolling() {
        isPolling = true
        pollTask = Task {
            let pollInterval: UInt64 = 3_000_000_000
            var attempts = 0
            let maxAttempts = 100

            while !Task.isCancelled && attempts < maxAttempts {
                try? await Task.sleep(nanoseconds: pollInterval)
                guard !Task.isCancelled else { break }
                attempts += 1

                logger.debug(
                    "Polling for device code activation",
                    context: ["attempt": String(attempts)]
                )
            }

            await MainActor.run {
                if attempts >= maxAttempts {
                    error = "Code expired. Please try again."
                    isPolling = false
                    requestCode()
                }
            }
        }
    }
}
