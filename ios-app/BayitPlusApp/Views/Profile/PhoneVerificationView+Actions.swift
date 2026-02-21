import Foundation

// MARK: - Verification Actions

extension PhoneVerificationView {
    func sendVerificationCode() async {
        isLoading = true
        error = nil

        do {
            _ = try await repos.user.sendPhoneVerification(phoneNumber: phoneNumber)
            codeSent = true
            startResendTimer()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func verifyCode() async {
        isVerifying = true
        error = nil

        do {
            _ = try await repos.user.verifyPhone(code: verificationCode)
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }

        isVerifying = false
    }

    func resendCode() async {
        verificationCode = ""
        await sendVerificationCode()
    }

    func startResendTimer() {
        resendTimer = 60
        timerActive = true

        Task {
            while resendTimer > 0 {
                try? await Task.sleep(for: .seconds(1))
                resendTimer -= 1
            }
            timerActive = false
        }
    }
}
