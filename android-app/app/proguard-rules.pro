# Bayit+ Android ProGuard Rules

# Keep Hilt classes and ViewModel keys (prevents duplicate key crash with R8)
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper
-keep class * extends androidx.lifecycle.ViewModel { *; }
-keepnames class * extends androidx.lifecycle.ViewModel

# Keep Retrofit
-keepattributes Signature
-keepattributes Exceptions
-keepattributes *Annotation*
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}
-keep class retrofit2.** { *; }

# Keep kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class tv.bayit.plus.core.model.**$$serializer { *; }
-keepclassmembers class tv.bayit.plus.core.model.** {
    *** Companion;
}
-keepclasseswithmembers class tv.bayit.plus.core.model.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# OkHttp: keep only public suffix database and platform callbacks
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.internal.publicsuffix.PublicSuffixDatabase { *; }
-keepnames class okhttp3.internal.platform.** { *; }
-keep class okhttp3.Callback { *; }
-keep class okhttp3.EventListener { *; }

# Keep Timber
-dontwarn org.jetbrains.annotations.**
-keep class timber.log.** { *; }

# Firebase: keep AutoValue-generated classes and @Keep-annotated
-keep class com.google.firebase.** implements com.google.auto.value.AutoValue { *; }
-keep @com.google.android.gms.common.annotation.KeepForSdk class com.google.firebase.** { *; }
-keep @androidx.annotation.Keep class com.google.firebase.** { *; }
-keep @androidx.annotation.Keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ExoPlayer: keep extractors and DRM components
-keep class androidx.media3.exoplayer.source.** { *; }
-keep class androidx.media3.extractor.** { *; }
-keep class androidx.media3.exoplayer.drm.** { *; }
-dontwarn androidx.media3.**

# Compose: keep runtime internals only (compiler handles rest)
-keep class androidx.compose.runtime.** { *; }
-dontwarn androidx.compose.**

# Coil: keep image decoders
-keep class coil3.decode.** { *; }
-keep class coil3.disk.** { *; }
-dontwarn coil3.**

# Navigation: keep Route class names used by type-safe nav and runtime route matching
-keepnames class tv.bayit.plus.navigation.Route
-keepnames class tv.bayit.plus.navigation.Route$* {
    public static ** INSTANCE;
}
-keep,includedescriptorclasses class tv.bayit.plus.navigation.**$$serializer { *; }
-keepclassmembers class tv.bayit.plus.navigation.** {
    *** Companion;
}
-keepclasseswithmembers class tv.bayit.plus.navigation.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# General Android
-keepclassmembers class * extends android.app.Activity {
   public void *(android.view.View);
}
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
