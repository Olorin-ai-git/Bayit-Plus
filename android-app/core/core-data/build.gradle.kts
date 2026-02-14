plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

android {
    namespace = "tv.bayit.plus.core.data"
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
}

dependencies {
    implementation(project(":core:core-common"))
    implementation(project(":core:core-network"))
    implementation(project(":core:core-model"))
    implementation(project(":core:core-database"))

    implementation(libs.core.ktx)
    implementation(libs.coroutines.core)
    implementation(libs.coroutines.android)
    implementation(libs.timber)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    testImplementation(libs.bundles.testing)
    testImplementation(libs.mockwebserver)
    testImplementation(libs.hilt.testing)
    kspTest(libs.hilt.compiler)
}
