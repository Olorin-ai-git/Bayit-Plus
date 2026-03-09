import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

// MARK: - TVHomeView Content Section Builders

extension TVHomeView {
    func continueWatchingSection(_ vm: HomeViewModel) -> some View {
        let filtered = appConfiguration.ownerMode
            ? vm.continueWatching
            : vm.continueWatching.filter { !ContentType.isOwnerOnlyType($0.type) }
        return TVContentSection(
            title: localization.t("home.continueWatching"),
            icon: "play.circle.fill",
            items: filtered,
            maxItems: 4,
            seeAllAction: { coordinator.selectedTab = .profile }
        ) { item in
            TVContentCard(
                imageURL: item.thumbnail,
                title: item.title ?? localization.t("common.untitled"),
                subtitle: item.type,
                progress: item.progress,
                aspectRatio: 2.0 / 3.0,
                placeholderIcon: "play.circle.fill"
            ) {
                let contentType = TVContentTypeMapper.map(item.type)
                if contentType == .vod {
                    coordinator.fullscreenRoute = .movieDetail(movieId: item.id)
                } else {
                    coordinator.presentPlayer(
                        contentId: item.id,
                        contentType: contentType
                    )
                }
            }
        }
    }

    @ViewBuilder
    func nearMeSection(_ vm: HomeViewModel) -> some View {
        if let israelisResponse = vm.israelisInCity,
           let content = israelisResponse.content,
           let newsArticles = content.newsArticles, !newsArticles.isEmpty
        {
            let items = newsArticles + (content.communityEvents ?? [])
            TVLocationContentRow(
                title: localization.t("home.israelisInCity"),
                items: items,
                coverage: israelisResponse.coverage
            )
        }

        if let businessesResponse = vm.israeliBusinesses,
           let content = businessesResponse.content,
           let businesses = content.newsArticles, !businesses.isEmpty
        {
            TVLocationContentRow(
                title: localization.t("home.israeliBusinesses"),
                items: businesses,
                coverage: businessesResponse.coverage
            )
        }
    }

    func trendingSection(_ vm: HomeViewModel) -> some View {
        TVTrendingRow(items: vm.trendingContent)
    }

    func citySection(_ cityName: String, items: [CityContentItem]) -> some View {
        TVCityContentRow(title: cityName, items: items)
    }

    func dynamicCitySection(cityName: String, items: [CultureItem]) -> some View {
        TVContentSection(
            title: cityName,
            icon: "building.2",
            items: items,
            maxItems: 4
        ) { item in
            TVContentCard(
                imageURL: item.imageUrl,
                title: item.title ?? cityName,
                subtitle: item.category,
                aspectRatio: 16.0 / 9.0,
                placeholderIcon: "photo"
            ) {
                if let urlString = item.contentUrl, let url = URL(string: urlString) {
                    coordinator.presentWebView(url: url, title: item.title ?? cityName)
                }
            }
        }
    }

    func liveChannelsSection(_ vm: HomeViewModel) -> some View {
        TVContentSection(
            title: localization.t("home.liveTV"),
            icon: "dot.radiowaves.left.and.right",
            items: vm.liveChannels,
            maxItems: 4,
            seeAllAction: { coordinator.selectedTab = .liveTV }
        ) { channel in
            TVContentCard(
                imageURL: channel.logo ?? channel.thumbnail,
                title: channel.name ?? localization.t("liveTV.channel"),
                subtitle: channel.currentShow,
                badge: "LIVE",
                aspectRatio: 1.0,
                placeholderIcon: "tv"
            ) {
                coordinator.presentPlayer(
                    contentId: channel.id,
                    contentType: .liveTV,
                    channelId: channel.id
                )
            }
        }
    }

    func radioStationsSection(_ stations: [RadioStationItem]) -> some View {
        TVContentSection(
            title: localization.t("home.radio"),
            icon: "radio",
            items: stations,
            maxItems: 8,
            seeAllAction: { coordinator.selectedTab = .podcasts }
        ) { station in
            TVContentCard(
                imageURL: station.logo,
                title: station.name ?? localization.t("nav.radio"),
                subtitle: station.currentSong ?? station.currentShow,
                aspectRatio: 1.0,
                placeholderIcon: "radio"
            ) {
                coordinator.presentPlayer(
                    contentId: station.id,
                    contentType: .radio
                )
            }
        }
    }

    func categorySection(_ section: TVHomeSection, category: ContentCategory) -> some View {
        TVContentSection(
            title: section.localizedTitle(localization),
            icon: section.icon,
            items: category.items,
            maxItems: 15,
            seeAllAction: {
                switch section {
                case .podcasts:
                    coordinator.fullscreenRoute = .podcastBrowse
                case .audiobooks:
                    coordinator.fullscreenRoute = .audiobookBrowse
                default:
                    coordinator.presentCategoryBrowse(
                        title: section.localizedTitle(localization),
                        icon: section.icon,
                        categoryName: category.name
                    )
                }
            }
        ) { item in
            TVContentCard(
                imageURL: item.thumbnail,
                title: item.title ?? localization.t("common.untitled"),
                badge: item.type?.lowercased() == "series" ? localization.t("home.series") : nil,
                aspectRatio: section.aspectRatio,
                placeholderIcon: placeholderIcon(for: section),
                availableSubtitleLanguages: item.availableSubtitleLanguages
            ) {
                navigateToCategoryItem(item, section: section)
            }
        }
    }
}
