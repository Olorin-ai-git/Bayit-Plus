package tv.bayit.plus.feature.discover.model

object DiscoverFeatureCatalog {

    val allFeatures: List<DiscoverFeature> by lazy {
        movieFeatures + liveTVFeatures + hebrewFeatures + searchFeatures + chatFeatures
    }

    fun features(category: DiscoverCategory): List<DiscoverFeature> =
        allFeatures.filter { it.category == category }

    fun featureById(id: String): DiscoverFeature? =
        allFeatures.firstOrNull { it.id == id }

    val categoriesOrdered: List<DiscoverCategory>
        get() = DiscoverCategory.entries.sortedBy { it.sortOrder }
}
