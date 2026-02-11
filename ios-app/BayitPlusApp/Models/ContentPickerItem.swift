import Foundation

// MARK: - Content Picker Tab

/// Tabs available in the content picker, mapping to browsable content types.
enum ContentPickerTab: String, CaseIterable, Sendable {
    case channels
    case podcasts
    case radio
    case audiobooks

    var displayLabel: String {
        switch self {
        case .channels: return "Channels"
        case .podcasts: return "Podcasts"
        case .radio: return "Radio"
        case .audiobooks: return "Audiobooks"
        }
    }

    var iconName: String {
        switch self {
        case .channels: return "tv"
        case .podcasts: return "mic"
        case .radio: return "radio"
        case .audiobooks: return "book"
        }
    }

    var widgetContentType: WidgetContentType {
        switch self {
        case .channels: return .liveChannel
        case .podcasts: return .podcast
        case .radio: return .radio
        case .audiobooks: return .audiobook
        }
    }
}

// MARK: - Content Picker Item

/// Normalized model unifying all 4 browsable content types into a single struct for the picker grid.
struct ContentPickerItem: Identifiable, Sendable {
    let id: String
    let title: String
    let subtitle: String?
    let thumbnailURL: URL?
    let tab: ContentPickerTab

    init(channel: LiveChannelItem) {
        self.id = channel.id
        self.title = channel.name ?? channel.id
        self.subtitle = channel.currentShow
        self.thumbnailURL = (channel.thumbnail ?? channel.logo).flatMap { URL(string: $0) }
        self.tab = .channels
    }

    init(podcast: PodcastShow) {
        self.id = podcast.id
        self.title = podcast.title ?? podcast.id
        self.subtitle = podcast.author
        self.thumbnailURL = podcast.cover.flatMap { URL(string: $0) }
        self.tab = .podcasts
    }

    init(station: RadioStationItem) {
        self.id = station.id
        self.title = station.name ?? station.id
        self.subtitle = station.genre
        self.thumbnailURL = station.logo.flatMap { URL(string: $0) }
        self.tab = .radio
    }

    init(audiobook: Audiobook) {
        self.id = audiobook.id
        self.title = audiobook.title ?? audiobook.id
        self.subtitle = audiobook.author
        self.thumbnailURL = audiobook.thumbnail.flatMap { URL(string: $0) }
        self.tab = .audiobooks
    }
}
