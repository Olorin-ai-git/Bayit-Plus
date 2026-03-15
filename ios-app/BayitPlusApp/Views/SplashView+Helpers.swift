import AVFoundation
import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

// MARK: - Audio & Helpers

extension SplashView {
    func playIntroAudio() {
        let fileName = isHebrew ? "Bayit_Intro_Hebrew" : "Bayit_Intro_English"
        guard let url = Bundle.main.url(forResource: fileName, withExtension: "mp3") else { return }
        do {
            let player = try AVAudioPlayer(contentsOf: url)
            player.prepareToPlay()
            player.play()
            audioPlayer = player
        } catch {
            // Audio is non-critical; splash continues without sound
        }
    }

    func stopAudioAndFinish() {
        audioPlayer?.stop()
        audioPlayer = nil
        onFinished()
    }

    var localizedSlogan: String {
        localization.t("splash.slogan")
    }

    func loadBundleLogo() -> UIImage? {
        guard let url = Bundle.main.url(forResource: "logo", withExtension: "png"),
              let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
    }
}
