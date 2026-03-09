plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

android {
    namespace = "tv.bayit.plus.feature.tv"
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
            "-opt-in=androidx.tv.material3.ExperimentalTvMaterial3Api",
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
    implementation(project(":core:core-auth"))
    implementation(project(":core:core-media"))
    implementation(project(":core:core-network"))
    implementation(project(":core:core-byoc"))
    implementation(project(":designsystem"))
    implementation(project(":localization"))

    implementation(libs.core.ktx)

    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.bundles.compose)

    // Compose for TV
    implementation(libs.tv.material)
    implementation(libs.tv.foundation)

    // Lifecycle
    implementation(libs.bundles.lifecycle)

    // Navigation
    implementation(libs.navigation.compose)

    // Hilt
    implementation(libs.hilt.android)
    implementation(libs.hilt.navigation.compose)
    implementation(libs.hilt.work)
    ksp(libs.hilt.compiler)

    // Room (Watch Next tracking)
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    // WorkManager (Watch Next sync)
    implementation(libs.work.runtime)

    // Media3 (ExoPlayer)
    implementation(libs.bundles.media3)

    // Image Loading
    implementation(libs.coil.compose)
    implementation(libs.coil.network)

    // Serialization
    implementation(libs.kotlinx.serialization.json)

    // TvProvider (Watch Next API)
    implementation(libs.tv.provider)

    // Coroutines
    implementation(libs.coroutines.core)
    implementation(libs.coroutines.android)

    // Logging
    implementation(libs.timber)

    // Testing
    testImplementation(libs.bundles.testing)
    testImplementation(libs.hilt.testing)
    testImplementation(project(":core:core-testing"))
    kspTest(libs.hilt.compiler)

    androidTestImplementation(libs.espresso.core)
    androidTestImplementation(libs.compose.ui.test)
    androidTestImplementation(libs.hilt.testing)
    kspAndroidTest(libs.hilt.compiler)

    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)
}
