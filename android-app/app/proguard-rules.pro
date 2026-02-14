# Bayit+ Android ProGuard Rules

# Keep Hilt classes
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper

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

# Keep OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Keep Timber
-dontwarn org.jetbrains.annotations.**
-keep class timber.log.** { *; }

# Keep Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Keep ExoPlayer
-keep class androidx.media3.** { *; }
-dontwarn androidx.media3.**

# Keep Compose
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

# Keep Coil
-keep class coil3.** { *; }
-dontwarn coil3.**

# General Android
-keepclassmembers class * extends android.app.Activity {
   public void *(android.view.View);
}
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
