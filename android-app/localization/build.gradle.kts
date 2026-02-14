plugins {
    alias(libs.plugins.android.library)
}

android {
    namespace = "tv.bayit.plus.localization"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
