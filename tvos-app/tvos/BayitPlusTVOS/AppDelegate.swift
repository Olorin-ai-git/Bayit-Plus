import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: RCTAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    self.moduleName = "BayitPlusTVOS"
    self.automaticallyLoadReactNativeWindow = true
    self.dependencyProvider = RCTAppDependencyProvider()
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func bundleURL() -> URL? {
    #if DEBUG
    // For tvOS simulator, use localhost which resolves to host machine
    #if targetEnvironment(simulator)
    return URL(string: "http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false")
    #else
    // For physical Apple TV devices, use RCTBundleURLProvider
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #endif
    #else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
