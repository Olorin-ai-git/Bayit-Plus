plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "tv.bayit.plus.core.testing"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "/META-INF/LICENSE.md"
            excludes += "/META-INF/LICENSE-notice.md"
        }
    }
}

dependencies {
    // Core Android dependencies
    implementation(libs.core.ktx)

    // JUnit 5
    api(libs.junit.jupiter.api)
    api(libs.junit.jupiter.params)
    runtimeOnly(libs.junit.jupiter.engine)

    // MockK for mocking
    api(libs.mockk.android)
    api(libs.mockk.agent)

    // Turbine for Flow testing
    api(libs.turbine)

    // Truth for assertions
    api(libs.truth)

    // Coroutines Test
    api(libs.coroutines.test)

    // Kotlin Test
    api(libs.kotlin.test)

    // Core models (for test data)
    implementation(project(":core:core-model"))

    // Common for BayitResult
    implementation(project(":core:core-common"))

    // Data layer for repository interfaces
    implementation(project(":core:core-data"))
}
