package tv.bayit.plus.feature.discover.model

/**
 * Platforms on which a [DiscoverFeature] is available.
 *
 * Mirrors the iOS `Platform` enum in BayitCore so that platform-gating logic
 * is expressed identically across both clients.
 */
enum class DiscoverPlatform {
    ANDROID,
    IOS,
    TVOS,
}
