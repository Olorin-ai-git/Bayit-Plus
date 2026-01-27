import UIKit
import React
import React_RCTAppDelegate

@main
class AppDelegate: RCTAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    self.moduleName = "BayitPlusTVOS"
    self.initialProps = [:]

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    return self.bundleURL()
  }

  override func bundleURL() -> URL? {
    // Always use bundled JavaScript for now
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
  }

  // Disable new architecture to use classic bridge for native modules
  override func newArchEnabled() -> Bool {
    return false
  }

  // Disable bridgeless mode to use classic bridge
  override func bridgelessEnabled() -> Bool {
    return false
  }
}
