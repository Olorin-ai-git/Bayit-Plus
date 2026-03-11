plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

android {
    namespace = "tv.bayit.plus.feature.discover"
    compileSdk = 35

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
        freeCompilerArgs += listOf(
            "-opt-in=androidx.compose.material3.ExperimentalMaterial3Api",
        )
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(project(":core:core-common"))
    implementation(project(":core:core-model"))
    implementation(project(":core:core-data"))
    implementation(project(":core:core-network"))
    implementation(project(":designsystem"))
    implementation(project(":localization"))

    implementation(libs.core.ktx)

    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.bundles.compose)

    // Lifecycle
    implementation(libs.bundles.lifecycle)

    // Navigation
    implementation(libs.navigation.compose)

    // Hilt
    implementation(libs.hilt.android)
    implementation(libs.hilt.navigation.compose)
    ksp(libs.hilt.compiler)

    // Coroutines
    implementation(libs.coroutines.core)
    implementation(libs.coroutines.android)

    // Networking
    implementation(libs.retrofit)
    implementation(libs.kotlinx.serialization.json)

    // Logging
    implementation(libs.timber)

    // Instrumented UI tests
    androidTestImplementation(libs.espresso.core)
    androidTestImplementation(libs.compose.ui.test)
    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)
}
