import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Content section builders extracted from HomeView to keep the main file under 200 lines.
extension HomeView {
    @ViewBuilder
    func contentSections(_ vm: HomeViewModel) -> some View {
        PageHeader(icon: "house.fill", title: localization.t("home.title"))

        cultureClocks

        ShabbatBannerView()
        ShabbatEveView()

        if appConfiguration.ownerMode && !vm.spotlight.isEmpty {
            HeroCarousel(items: vm.spotlight, coordinator: coordinator)
        }

        let filteredContinueWatching = appConfiguration.ownerMode
            ? vm.continueWatching
            : vm.continueWatching.filter { !ContentType.isOwnerOnlyType($0.type) }
        if !filteredContinueWatching.isEmpty {
            ContinueWatchingRow(items: filteredContinueWatching, coordinator: coordinator)
        }

        if appConfiguration.ownerMode && !vm.featuredCollections.isEmpty {
            FeaturedCollectionsCarousel(collections: vm.featuredCollections)
                .padding(.horizontal, DesignTokens.Spacing.lg)
        }

        if !vm.liveChannels.isEmpty {
            LiveTVRow(channels: vm.liveChannels, coordinator: coordinator)
        }

        BYOCShelfRow()

        if !vm.radioStations.isEmpty {
            RadioStationsRow(stations: vm.radioStations)
        }

        locationSections(vm)

        if !vm.trendingContent.isEmpty {
            TrendingRow(items: vm.trendingContent, coordinator: coordinator)
        }

        if !vm.youngstersTrending.isEmpty {
            youngstersSection(vm)
        }

        citySections(vm)
        categoryRows(vm)
    }

    // MARK: - Culture Clocks

    var cultureClocks: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            CultureClock(
                flagEmoji: "\u{1F1EE}\u{1F1F1}",
                locationLabel: "Time in Israel",
                timezone: TimeZone(identifier: "Asia/Jerusalem")!,
                isIsraeli: true
            )
            Spacer()
            CultureClock(
                flagEmoji: "\u{1F1FA}\u{1F1F8}",
                locationLabel: "Time in New York, NY",
                timezone: TimeZone(identifier: "America/New_York")!,
                isIsraeli: false
            )
        }
        .padding(.leading, DesignTokens.Spacing.lg + 4)
        .padding(.trailing, DesignTokens.Spacing.lg)
        .padding(.bottom, DesignTokens.Spacing.md)
    }

    // MARK: - Location Sections

    @ViewBuilder
    func locationSections(_ vm: HomeViewModel) -> some View {
        if let israelisResponse = vm.israelisInCity,
           let content = israelisResponse.content,
           let newsArticles = content.newsArticles, !newsArticles.isEmpty
        {
            let items = newsArticles + (content.communityEvents ?? [])
            LocationContentRow(
                title: "Israelis in Your City",
                items: items,
                coverage: israelisResponse.coverage
            )
        }

        if let businessesResponse = vm.israeliBusinesses,
           let content = businessesResponse.content,
           let businesses = content.newsArticles, !businesses.isEmpty
        {
            LocationContentRow(
                title: "Israeli Businesses Near You",
                items: businesses,
                coverage: businessesResponse.coverage
            )
        }
    }

    // MARK: - City Sections

    @ViewBuilder
    func citySections(_ vm: HomeViewModel) -> some View {
        if let jerusalem = vm.jerusalemContent, !jerusalem.items.isEmpty {
            CityContentRow(title: "Jerusalem", items: jerusalem.items) {
                coordinator.navigate(to: .jerusalemContent)
            }
        }

        if let telAviv = vm.telAvivContent, !telAviv.items.isEmpty {
            CityContentRow(title: "Tel Aviv", items: telAviv.items) {
                coordinator.navigate(to: .telAvivContent)
            }
        }

        ForEach(vm.cultureCities) { cityWithContent in
            DynamicCityContentRow(
                cityName: cityWithContent.city.name,
                items: cityWithContent.content.items,
                accentColor: DesignTokens.Primary.p400
            )
        }
    }

    // MARK: - Category Rows

    func categoryRows(_ vm: HomeViewModel) -> some View {
        ForEach(vm.categories.filter { category in
            let name = category.name.lowercased()
            let hidden = ["movie", "series", "audiobook", "kid", "children", "music", "documentar"]
            if appConfiguration.ownerMode {
                return true
            } else {
                return !hidden.contains(where: { name.contains($0) })
            }
        }) { category in
            CategoryRow(
                category: category,
                coordinator: coordinator,
                cardActions: cardActions
            )
        }
    }
}
