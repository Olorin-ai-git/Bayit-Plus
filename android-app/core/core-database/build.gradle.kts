plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.room)
}

android {
    namespace = "tv.bayit.plus.core.database"
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

    room {
        schemaDirectory("$projectDir/schemas")
    }
}

dependencies {
    implementation(project(":core:core-common"))
    implementation(project(":core:core-model"))

    implementation(libs.core.ktx)
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    implementation(libs.room.paging)
    ksp(libs.room.compiler)

    implementation(libs.datastore.preferences)

    implementation(libs.coroutines.core)
    implementation(libs.coroutines.android)
    implementation(libs.timber)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    testImplementation(libs.bundles.testing)
    testImplementation(libs.room.testing)
    testImplementation(libs.hilt.testing)
    kspTest(libs.hilt.compiler)
}
