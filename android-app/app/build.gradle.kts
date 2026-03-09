plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.google.services)
    alias(libs.plugins.firebase.crashlytics)
}

android {
    namespace = "tv.bayit.plus"
    compileSdk = 35

    defaultConfig {
        applicationId = "tv.bayit.plus"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }

        // 64-bit only for Google TV compliance (August 2026 mandate)
        ndk {
            abiFilters += listOf("arm64-v8a", "x86_64")
        }

        buildConfigField("String", "API_BASE_URL", "\"${project.findProperty("bayit.api.baseUrl") ?: "https://api.bayit.tv/"}\"")
        buildConfigField("String", "WS_BASE_URL", "\"${project.findProperty("bayit.ws.baseUrl") ?: "wss://ws.bayit.tv/"}\"")
        buildConfigField("String", "CDN_BASE_URL", "\"${project.findProperty("bayit.cdn.baseUrl") ?: "https://cdn.bayit.tv"}\"")
        buildConfigField("String", "CAST_RECEIVER_APP_ID", "\"${project.findProperty("bayit.cast.receiverAppId") ?: ""}\"")
        buildConfigField(
            "String",
            "GOOGLE_CLIENT_ID",
            "\"${project.findProperty("bayit.google.clientId")?.toString()
                ?: throw GradleException(
                    """
                    Missing required property: bayit.google.clientId

                    Add to gradle.properties:
                      bayit.google.clientId=YOUR_GOOGLE_CLIENT_ID

                    Get client ID from Google Cloud Console:
                      https://console.cloud.google.com/apis/credentials
                    """.trimIndent()
                )}\""
        )
        buildConfigField(
            "String",
            "GOOGLE_CLIENT_SECRET",
            "\"${project.findProperty("bayit.google.clientSecret")?.toString() ?: ""}\""
        )
        buildConfigField(
            "String",
            "BILLING_PRODUCT_MONTHLY",
            "\"${project.findProperty("bayit.billing.monthlyProductId") ?: "tv.bayit.plus.monthly"}\""
        )
        buildConfigField(
            "String",
            "BILLING_PRODUCT_YEARLY",
            "\"${project.findProperty("bayit.billing.yearlyProductId") ?: "tv.bayit.plus.yearly"}\""
        )

    }

    signingConfigs {
        if (project.hasProperty("bayit.keystore.path")) {
            create("release") {
                storeFile = file(project.property("bayit.keystore.path").toString())
                storePassword = project.property("bayit.keystore.password").toString()
                keyAlias = project.property("bayit.key.alias").toString()
                keyPassword = project.property("bayit.key.password").toString()
            }
        }
    }

    buildTypes {
        debug {
            isDebuggable = true
            versionNameSuffix = "-debug"
            buildConfigField("Boolean", "OWNER_MODE", "true")
        }
        release {
            buildConfigField("Boolean", "OWNER_MODE", "false")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = if (signingConfigs.names.contains("release")) {
                signingConfigs.getByName("release")
            } else {
                null
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf(
            "-opt-in=kotlin.RequiresOptIn",
            "-opt-in=kotlinx.coroutines.ExperimentalCoroutinesApi",
            "-opt-in=androidx.compose.material3.ExperimentalMaterial3Api"
        )
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    lint {
        enable += listOf("TvLeanback")
        warningsAsErrors = false
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Core modules
    implementation(project(":core:core-common"))
    implementation(project(":core:core-network"))
    implementation(project(":core:core-model"))
    implementation(project(":core:core-data"))
    implementation(project(":core:core-database"))
    implementation(project(":core:core-auth"))
    implementation(project(":core:core-media"))
    implementation(project(":core:core-voice"))
    implementation(project(":core:core-analytics"))
    implementation(project(":core:core-cast"))
    implementation(project(":core:core-byoc"))

    // Design system
    implementation(project(":designsystem"))

    // Localization
    implementation(project(":localization"))

    // Feature modules
    implementation(project(":feature:feature-home"))
    implementation(project(":feature:feature-livetv"))
    implementation(project(":feature:feature-vod"))
    implementation(project(":feature:feature-radio"))
    implementation(project(":feature:feature-podcasts"))
    implementation(project(":feature:feature-search"))
    implementation(project(":feature:feature-player"))
    implementation(project(":feature:feature-zehani"))
    implementation(project(":feature:feature-profile"))
    implementation(project(":feature:feature-settings"))
    implementation(project(":feature:feature-auth"))
    implementation(project(":feature:feature-social"))
    implementation(project(":feature:feature-voice"))
    implementation(project(":feature:feature-culture"))
    implementation(project(":feature:feature-kids"))
    implementation(project(":feature:feature-audiobooks"))
    implementation(project(":feature:feature-trivia"))
    implementation(project(":feature:feature-rewards"))
    implementation(project(":feature:feature-missions"))
    implementation(project(":feature:feature-downloads"))
    implementation(project(":feature:feature-widgets"))
    implementation(project(":feature:feature-byoc"))
    implementation(project(":feature:feature-onboarding"))
    implementation(project(":feature:feature-tv"))
    implementation(project(":widget"))

    // Compose for TV
    implementation(libs.tv.material)
    implementation(libs.tv.foundation)

    // AndroidX Core
    implementation(libs.core.ktx)
    implementation(libs.appcompat)
    implementation(libs.activity.compose)

    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.bundles.compose)

    // Serialization
    implementation(libs.kotlinx.serialization.json)

    // Lifecycle
    implementation(libs.bundles.lifecycle)

    // Navigation
    implementation(libs.navigation.compose)

    // Hilt
    implementation(libs.hilt.android)
    implementation(libs.hilt.navigation.compose)
    ksp(libs.hilt.compiler)

    // Firebase
    implementation(platform(libs.firebase.bom))
    implementation(libs.bundles.firebase)

    // Google Identity (Credential Manager)
    implementation(libs.credential.manager)
    implementation(libs.credential.manager.play)
    implementation(libs.google.id)

    // Coroutines
    implementation(libs.coroutines.core)
    implementation(libs.coroutines.android)

    // Logging
    implementation(libs.timber)

    // Testing
    testImplementation(libs.bundles.testing)
    testImplementation(libs.hilt.testing)
    kspTest(libs.hilt.compiler)

    androidTestImplementation(platform(libs.compose.bom))
    androidTestImplementation(libs.espresso.core)
    androidTestImplementation(libs.compose.ui.test)
    androidTestImplementation(libs.hilt.testing)
    kspAndroidTest(libs.hilt.compiler)

    debugImplementation(platform(libs.compose.bom))
    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)
}
