import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Live TV channels row with "LIVE" badges and current program info from EPG.
/// Loads channels and EPG data independently, hides when no channels available.
struct TVLiveNowRow: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.appConfiguration) private var appConfiguration

    @State private var channels: [LiveChannelItem] = []
    @State private var currentPrograms: [String: EPGCurrentResponse] = [:]
    @State private var hasLoaded = false

    var body: some View {
        Group {
            if hasLoaded && !channels.isEmpty {
                TVContentSection(
                    title: localization.t("home.liveNow"),
                    icon: "dot.radiowaves.left.and.right",
                    items: channels,
                    maxItems: 8,
                    seeAllAction: { coordinator.selectedTab = .liveTV }
                ) { channel in
                    liveChannelCard(channel)
                }
            }
        }
        .task { await loadData() }
    }

    private func liveChannelCard(_ channel: LiveChannelItem) -> some View {
        let epg = currentPrograms[channel.id]
        let programName = epg?.current?.title ?? channel.currentShow
        return TVContentCard(
            imageURL: channel.logo ?? channel.thumbnail,
            title: channel.name ?? localization.t("liveTV.channel"),
            subtitle: programName,
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

    private func loadData() async {
        async let channelsTask = loadChannels()
        await channelsTask
        await loadEPGData()
        hasLoaded = true
    }

    private func loadChannels() async {
        do {
            let response = try await repos.liveTV.fetchChannels(
                cultureId: nil,
                category: nil
            )
            let hidden = appConfiguration.ownerMode
                ? [] : appConfiguration.hiddenChannelKeywords
            channels = response.channels.filter { channel in
                guard let name = channel.name?.lowercased() else { return true }
                return !hidden.contains(where: { name.contains($0) })
            }
        } catch {
            channels = []
        }
    }

    private func loadEPGData() async {
        await withTaskGroup(of: (String, EPGCurrentResponse?).self) { group in
            for channel in channels {
                group.addTask {
                    let response = try? await repos.epg.fetchCurrentProgram(
                        channelId: channel.id
                    )
                    return (channel.id, response)
                }
            }
            for await (channelId, response) in group {
                if let response {
                    currentPrograms[channelId] = response
                }
            }
        }
    }
}
