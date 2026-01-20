import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Sentry

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Initialize Sentry early for crash reporting
    initializeSentry()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "BayitPlus",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  /// Initialize Sentry for error tracking and crash reporting
  private func initializeSentry() {
    // Get DSN from Info.plist (set during build time or deployment)
    guard let infoPlist = Bundle.main.infoDictionary,
          let sentryDSN = infoPlist["SENTRY_DSN"] as? String,
          !sentryDSN.isEmpty else {
      print("[AppDelegate] Sentry DSN not configured, error tracking disabled")
      return
    }

    // Determine environment
    let environment = getEnvironment()

    SentrySDK.start { options in
      options.dsn = sentryDSN
      options.environment = environment
      options.releaseVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String

      // Enable crash reporting
      options.attachStacktrace = true
      options.attachThreads = true

      // App hang detection (ANR on Android, App Hang on iOS)
      options.enableAppHangTracking = true
      options.appHangTimeoutInterval = 5

      // Trace performance (10% sample rate to avoid overhead)
      options.tracesSampleRate = 0.1

      // Don't send PII by default
      options.sendDefaultPii = false

      // Enable native SDK integration
      options.integrations = { integrations in
        integrations.remove(where: { $0 is SentryFileLoggingIntegration })
        return integrations
      }

      print("[AppDelegate] Sentry initialized - environment: \(environment)")
    }
  }

  /// Determine current environment
  private func getEnvironment() -> String {
    #if DEBUG
    return "development"
    #else
    return "production"
    #endif
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
