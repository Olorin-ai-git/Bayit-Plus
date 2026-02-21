import BayitMedia
import BayitNotifications
import UIKit

// MARK: - AppDelegate

class AppDelegate: NSObject, UIApplicationDelegate {
    static var pushNotificationService: PushNotificationService?

    // Shared instances for CarPlay and other secondary scenes
    static var sharedRepositories: RepositoryProvider?
    static var sharedMediaPlayer: MediaPlayer?
    static var sharedStreamResolver: StreamResolver?

    func application(
        _: UIApplication,
        didFinishLaunchingWithOptions _: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        return true
    }

    func application(
        _: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        // Forward to push notification service
        Task { @MainActor in
            AppDelegate.pushNotificationService?.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
        }
    }

    func application(
        _: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        // Forward to push notification service
        Task { @MainActor in
            AppDelegate.pushNotificationService?.didFailToRegisterForRemoteNotifications(withError: error)
        }
    }

    func application(
        _: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options _: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        if connectingSceneSession.role == .carTemplateApplication {
            let config = UISceneConfiguration(
                name: "CarPlay Configuration",
                sessionRole: .carTemplateApplication
            )
            config.delegateClass = CarPlaySceneDelegate.self
            return config
        }
        return UISceneConfiguration(
            name: "Default Configuration",
            sessionRole: .windowApplication
        )
    }

    func application(
        _: UIApplication,
        supportedInterfaceOrientationsFor _: UIWindow?
    ) -> UIInterfaceOrientationMask {
        return .allButUpsideDown
    }
}
