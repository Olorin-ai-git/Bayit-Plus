import BayitNetworking
#if !os(tvOS)
    import BayitWidgetShared
#endif
import Foundation

// MARK: - Section Loading Methods

extension HomeViewModel {
    @MainActor
    func loadLiveChannels() async {
        do {
            let response = try await liveTVRepo.fetchChannels(cultureId: nil, category: nil)
            let filtered: [LiveChannelItem]
            if flags.isLegacyFeaturesEnabled {
                filtered = response.channels
            } else {
                filtered = response.channels.filter { channel in
                    guard let name = channel.name?.lowercased() else { return true }
                    return !hiddenChannelKeywords.contains(where: { name.contains($0) })
                }
            }
            liveChannels = Array(filtered.prefix(contentRowLimit))
        } catch {
            liveChannels = []
        }
    }

    @MainActor
    func loadRadioStations() async {
        do {
            let response = try await radioRepo.fetchStations(cultureId: nil, genre: nil)
            radioStations = Array(response.stations.prefix(contentRowLimit))
        } catch {
            radioStations = []
        }
    }

    @MainActor
    func loadFeaturedCollections() async {
        do {
            featuredCollections = try await contentRepo.fetchCollectionRecommendations()
        } catch {
            featuredCollections = []
        }
    }

    @MainActor
    func loadContinueWatching() async {
        do {
            let response = try await mediaRepo.fetchContinueWatching()
            continueWatching = response.items
            #if !os(tvOS)
                if let sync = widgetSyncService, !response.items.isEmpty {
                    let sharedItems = response.items.map { item in
                        SharedContinueWatchingItem(
                            id: item.id,
                            contentID: item.id,
                            title: item.title ?? "",
                            thumbnailURL: item.thumbnail.flatMap { URL(string: $0) },
                            progress: item.progress ?? 0,
                            durationSeconds: Int(item.duration ?? 0),
                            contentType: {
                                switch item.type?.lowercased() {
                                case "live_tv", "live", "channel": return SharedContentType.liveTV
                                case "radio": return SharedContentType.radio
                                case "podcast": return SharedContentType.podcast
                                case "audiobook": return SharedContentType.audiobook
                                default: return SharedContentType.vod
                                }
                            }()
                        )
                    }
                    await sync.syncContinueWatching(sharedItems)
                }
            #endif
        } catch {
            // Non-blocking: silently fail (user may not be authenticated)
            continueWatching = []
        }
    }

    @MainActor
    func loadTelAvivContent() async {
        do {
            telAvivContent = try await contentRepo.fetchTelAvivContent()
        } catch {
            telAvivContent = nil
        }
    }

    @MainActor
    func loadJerusalemContent() async {
        do {
            jerusalemContent = try await contentRepo.fetchJerusalemContent()
        } catch {
            jerusalemContent = nil
        }
    }

    @MainActor
    func loadTrending() async {
        do {
            trendingContent = try await contentRepo.fetchTrending(cultureId: defaultCultureId)
        } catch {
            trendingContent = []
        }
    }

    @MainActor
    func loadLocationContent() async {
        guard let location = await locationService.currentLocation(),
              let city = location.city
        else {
            israelisInCity = nil
            israeliBusinesses = nil
            return
        }
        let state = location.state ?? ""

        async let israelisTask: Void = loadIsraelisInCity(city: city, state: state)
        async let businessesTask: Void = loadIsraeliBusinesses(city: city, state: state)

        await israelisTask
        await businessesTask
    }

    @MainActor
    func loadIsraelisInCity(city: String, state: String) async {
        do {
            israelisInCity = try await contentRepo.fetchIsraelisInCity(city: city, state: state)
        } catch {
            israelisInCity = nil
        }
    }

    @MainActor
    func loadIsraeliBusinesses(city: String, state: String) async {
        do {
            israeliBusinesses = try await contentRepo.fetchIsraeliBusinesses(city: city, state: state)
        } catch {
            israeliBusinesses = nil
        }
    }

    @MainActor
    func loadYoungstersTrending() async {
        guard let catRepo = categoryRepo else { return }
        do {
            let response = try await catRepo.fetchYoungstersTrending()
            youngstersTrending = response.items
        } catch {
            youngstersTrending = []
        }
    }

    @MainActor
    func loadCultureCities() async {
        guard let catRepo = categoryRepo else { return }
        do {
            let cities = try await catRepo.fetchCultureCities(cultureId: defaultCultureId, featuredOnly: true)
            let filteredCities = cities.filter { $0.cityId != "jerusalem" && $0.cityId != "tel-aviv" }

            cultureCities = await withTaskGroup(
                of: CultureCityWithContent?.self,
                returning: [CultureCityWithContent].self
            ) { group in
                for city in filteredCities {
                    group.addTask {
                        guard let content = try? await catRepo.fetchCityContent(
                            cultureId: self.defaultCultureId,
                            cityId: city.cityId,
                            limit: 10
                        ), !content.items.isEmpty else {
                            return nil
                        }
                        return CultureCityWithContent(city: city, content: content)
                    }
                }

                var results: [CultureCityWithContent] = []
                for await result in group {
                    if let cityWithContent = result {
                        results.append(cityWithContent)
                    }
                }
                return results
            }
        } catch {
            cultureCities = []
        }
    }
}
