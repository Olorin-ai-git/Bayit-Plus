#if os(iOS)
    import Foundation
    import SwiftUI

    // MARK: - Countdown Timer

    extension CatchUpAutoPromptView {
        func startCountdown() {
            countdownTask = Task {
                while secondsRemaining > 0, !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(1))
                    guard !Task.isCancelled else { return }
                    secondsRemaining -= 1
                }
                guard !Task.isCancelled else { return }
                onDecline()
            }
        }
    }
#endif
