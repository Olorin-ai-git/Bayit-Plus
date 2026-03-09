pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "BayitPlus"

include(":app")

// Core modules
include(":core:core-common")
include(":core:core-network")
include(":core:core-model")
include(":core:core-data")
include(":core:core-database")
include(":core:core-auth")
include(":core:core-location")
include(":core:core-media")
include(":core:core-voice")
include(":core:core-analytics")
include(":core:core-testing")
include(":core:core-cast")
include(":core:core-byoc")

// Design system
include(":designsystem")

// Localization
include(":localization")

// Feature modules
include(":feature:feature-home")
include(":feature:feature-livetv")
include(":feature:feature-vod")
include(":feature:feature-radio")
include(":feature:feature-podcasts")
include(":feature:feature-search")
include(":feature:feature-player")
include(":feature:feature-zehani")
include(":feature:feature-profile")
include(":feature:feature-settings")
include(":feature:feature-auth")
include(":feature:feature-social")
include(":feature:feature-voice")
include(":feature:feature-culture")
include(":feature:feature-kids")
include(":feature:feature-audiobooks")
include(":feature:feature-trivia")
include(":feature:feature-rewards")
include(":feature:feature-missions")
include(":feature:feature-downloads")
include(":feature:feature-widgets")
include(":feature:feature-byoc")
include(":feature:feature-onboarding")
include(":feature:feature-tv")

// Widget module (app-level)
include(":widget")
