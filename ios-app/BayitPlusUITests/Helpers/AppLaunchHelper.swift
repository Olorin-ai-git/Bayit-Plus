import XCTest

@MainActor
enum AppLaunchHelper {
    static func launchApp(
        skipAuth: Bool = true,
        seedYouTube: Bool = true,
        language: String? = nil,
        navigateTo route: String? = nil,
        authenticateForAI: Bool = false
    ) -> XCUIApplication {
        let app = XCUIApplication()
        var arguments = ["--ui-testing"]

        if skipAuth {
            arguments.append("--skip-auth")
        }

        if seedYouTube {
            arguments.append("--seed-youtube")
        }

        app.launchArguments = arguments

        var environment: [String: String] = [:]

        if let language {
            environment["UI_TEST_LANGUAGE"] = language
        }

        if let route {
            environment["UI_TEST_NAVIGATE_TO"] = route
        }

        if authenticateForAI,
           let token = TestAuthHelper.fetchTestToken()
        {
            environment["UI_TEST_AUTH_TOKEN"] = token
        }

        if !environment.isEmpty {
            app.launchEnvironment = environment
        }

        app.launch()
        return app
    }

    static func launchForAuth() -> XCUIApplication {
        launchApp(skipAuth: false)
    }

    static func launchWithLanguage(_ language: String) -> XCUIApplication {
        launchApp(language: language)
    }

    static func launchToRoute(_ route: String) -> XCUIApplication {
        launchApp(navigateTo: route)
    }
}
