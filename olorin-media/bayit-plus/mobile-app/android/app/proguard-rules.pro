# Bayit+ Android ProGuard Rules
# Add project specific ProGuard rules here.

# ============================================
# GOOGLE CAST SDK
# ============================================

# Keep all Google Cast SDK classes
-keep class com.google.android.gms.cast.** { *; }
-keep class com.google.android.gms.cast.framework.** { *; }

# Keep MediaRouter classes (required for Cast device discovery)
-keep class androidx.mediarouter.** { *; }
-keep class android.support.v7.app.MediaRouteButton { *; }
-keep class androidx.appcompat.app.MediaRouteButton { *; }

# Don't warn about Google Cast SDK dependencies
-dontwarn com.google.android.gms.cast.**
-dontwarn androidx.mediarouter.**

# ============================================
# REACT NATIVE GOOGLE CAST
# ============================================

# Keep React Native Google Cast bridge
-keep class com.reactnative.googlecast.** { *; }
-dontwarn com.reactnative.googlecast.**

# Keep Cast Options Provider (custom class)
-keep class com.bayitplus.CastOptionsProvider { *; }

# ============================================
# REACT NATIVE CORE
# ============================================

# React Native core (from react-native default template)
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip
-keep,allowobfuscation @interface com.facebook.jni.annotations.DoNotStrip

# Do not strip any method/class that is annotated with @DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.common.internal.DoNotStrip class *
-keep @com.facebook.jni.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
    @com.facebook.jni.annotations.DoNotStrip *;
}

-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}

# ============================================
# REACT NATIVE VIDEO
# ============================================

# Keep react-native-video classes (for AirPlay support)
-keep class com.brentvatne.** { *; }
-dontwarn com.brentvatne.**

# ============================================
# ANDROIDX & SUPPORT LIBRARIES
# ============================================

# Keep support library classes
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# ============================================
# GOOGLE PLAY SERVICES
# ============================================

# Keep Google Play Services classes used by Cast SDK
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.gms.tasks.** { *; }
-dontwarn com.google.android.gms.**

# ============================================
# HERMES
# ============================================

# Hermes JavaScript engine (if using Hermes)
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ============================================
# NETWORKING & HTTP
# ============================================

# OkHttp (used by React Native networking)
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# ============================================
# GENERAL ANDROID
# ============================================

# Keep native method names
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep custom view constructors
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelables
-keep class * implements android.os.Parcelable {
  public static final android.os.Parcelable$Creator *;
}
