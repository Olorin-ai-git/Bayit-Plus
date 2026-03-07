import Foundation

/// Converts Xtream Codes items into BYOCChannel and BYOCContentItem.
public enum XtreamContentAdapter {
    /// Convert a live stream to a BYOCChannel.
    public static func adaptLiveStream(
        _ stream: XtreamLiveStream,
        category: XtreamCategory,
        client: XtreamCodesClient,
        sourceId: String
    ) async -> BYOCChannel? {
        guard let streamURL = await client.liveStreamURL(streamId: stream.streamId) else {
            return nil
        }
        let logoURL = stream.streamIcon.flatMap { URL(string: $0) }

        return BYOCChannel(
            name: stream.name,
            logoURL: logoURL,
            group: category.categoryName,
            streamURL: streamURL,
            sourceId: sourceId,
            attributes: [
                "epg_channel_id": stream.epgChannelId ?? "",
                "stream_id": String(stream.streamId),
            ]
        )
    }

    /// Convert all live streams to channels.
    public static func adaptAllLiveStreams(
        streams: [XtreamLiveStream],
        categories: [XtreamCategory],
        client: XtreamCodesClient,
        sourceId: String
    ) async -> [BYOCChannel] {
        let categoryMap = Dictionary(
            uniqueKeysWithValues: categories.map { ($0.categoryId, $0) }
        )
        var channels: [BYOCChannel] = []
        for stream in streams {
            let cat = categoryMap[stream.categoryId] ?? XtreamCategory(
                categoryId: stream.categoryId,
                categoryName: "Uncategorized"
            )
            if let channel = await adaptLiveStream(
                stream, category: cat, client: client, sourceId: sourceId
            ) {
                channels.append(channel)
            }
        }
        return channels
    }

    /// Convert a VOD item to a BYOCContentItem.
    public static func adaptVODItem(
        _ item: XtreamVODItem,
        category: XtreamCategory,
        client: XtreamCodesClient,
        sourceId: String
    ) async -> BYOCContentItem? {
        guard let streamURL = await client.vodStreamURL(
            streamId: item.streamId, ext: item.containerExtension
        ) else {
            return nil
        }
        let thumbURL = item.streamIcon.flatMap { URL(string: $0) }
        let year = item.year.flatMap { Int($0) }

        return BYOCContentItem(
            id: "xtream-\(sourceId)-vod-\(item.streamId)",
            title: item.name,
            thumbnailURL: thumbURL,
            year: year,
            genre: category.categoryName,
            sourceType: .xtream,
            sourceId: sourceId,
            streamURL: streamURL,
            contentType: .movie
        )
    }

    /// Convert all VOD items.
    public static func adaptAllVOD(
        items: [XtreamVODItem],
        categories: [XtreamCategory],
        client: XtreamCodesClient,
        sourceId: String
    ) async -> [BYOCContentItem] {
        let categoryMap = Dictionary(
            uniqueKeysWithValues: categories.map { ($0.categoryId, $0) }
        )
        var results: [BYOCContentItem] = []
        for item in items {
            let cat = categoryMap[item.categoryId] ?? XtreamCategory(
                categoryId: item.categoryId, categoryName: "Movies"
            )
            if let content = await adaptVODItem(
                item, category: cat, client: client, sourceId: sourceId
            ) {
                results.append(content)
            }
        }
        return results
    }

    /// Convert a series entry to a BYOCContentItem.
    public static func adaptSeries(
        _ series: XtreamSeries,
        sourceId: String
    ) -> BYOCContentItem {
        let thumbURL = series.cover.flatMap { URL(string: $0) }
        let year = series.year.flatMap { Int($0) }

        return BYOCContentItem(
            id: "xtream-\(sourceId)-series-\(series.seriesId)",
            title: series.name,
            description: series.plot,
            thumbnailURL: thumbURL,
            year: year,
            genre: series.genre,
            sourceType: .xtream,
            sourceId: sourceId,
            contentType: .series
        )
    }

    /// Convert all series.
    public static func adaptAllSeries(
        series: [XtreamSeries],
        sourceId: String
    ) -> [BYOCContentItem] {
        series.map { adaptSeries($0, sourceId: sourceId) }
    }
}
