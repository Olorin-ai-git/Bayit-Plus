import BayitNetworking
import Foundation

/// Repository protocol for live TV API operations.
///
/// Abstracts API calls for channels, EPG (Electronic Program Guide), and live streams
/// behind a protocol for testability.
protocol LiveTVRepository: Sendable {
    /// Fetch list of live TV channels.
    ///
    /// - Parameters:
    ///   - cultureId: Optional culture filter (e.g., "he", "en").
    ///   - category: Optional category filter (e.g., "news", "sports").
    /// - Returns: Channels response with list of live channels.
    /// - Throws: `NetworkError` if the request fails.
    func fetchChannels(
        cultureId: String?,
        category: String?
    ) async throws -> ChannelsResponse

    /// Fetch detailed information for a specific live channel.
    ///
    /// - Parameter id: Channel ID.
    /// - Returns: Channel detail with stream URL, schedule, and AI features.
    /// - Throws: `NetworkError` if the request fails.
    func fetchChannelDetail(id: String) async throws -> ChannelDetail

    /// Fetch EPG (Electronic Program Guide) for a specific channel.
    ///
    /// - Parameters:
    ///   - channelId: Channel ID.
    ///   - date: Optional date in ISO format (defaults to today if nil).
    /// - Returns: EPG response with program entries for the specified date.
    /// - Throws: `NetworkError` if the request fails.
    func fetchEPG(
        channelId: String,
        date: String?
    ) async throws -> ChannelEPGResponse

    /// Fetch live stream URL for a specific channel.
    ///
    /// - Parameter channelId: Channel ID.
    /// - Returns: Live stream response with HLS URL and metadata.
    /// - Throws: `NetworkError` if the request fails.
    func fetchStreamURL(channelId: String) async throws -> LiveStreamResponse

    /// Fetch catch-up transcript and AI summary for a live channel (legacy).
    ///
    /// - Parameter channelId: Channel ID.
    /// - Returns: Catch-up response with transcript segments and AI summary.
    /// - Throws: `NetworkError` if the request fails.
    func fetchCatchUp(channelId: String) async throws -> CatchUpResponse

    /// Fetch AI-generated catch-up summary with credit deduction.
    ///
    /// - Parameters:
    ///   - channelId: Channel ID.
    ///   - windowMinutes: Number of minutes of content to summarize.
    ///   - targetLanguage: Language code for the summary (e.g., "en", "he").
    /// - Returns: Summary response with key points, program info, and credit usage.
    /// - Throws: `APIError.paymentRequired` if insufficient credits.
    func fetchCatchUpSummary(
        channelId: String,
        windowMinutes: Int,
        targetLanguage: String
    ) async throws -> CatchUpSummaryResponse

    /// Check whether catch-up is available for the current user on a channel.
    ///
    /// - Parameter channelId: Channel ID.
    /// - Returns: Availability response with beta/credit status.
    /// - Throws: `NetworkError` if the request fails.
    func checkCatchUpAvailability(channelId: String) async throws -> CatchUpAvailabilityResponse

    /// Fetch transcript timeline segments for a live channel.
    ///
    /// - Parameters:
    ///   - channelId: Channel ID.
    ///   - windowMinutes: Number of minutes of transcripts to fetch.
    /// - Returns: Transcript timeline response with segments.
    /// - Throws: `NetworkError` if the request fails.
    func fetchTranscriptTimeline(
        channelId: String,
        windowMinutes: Int
    ) async throws -> TranscriptTimelineResponse

    /// Fetch transcript accumulation status for a live channel.
    ///
    /// - Parameter channelId: Channel ID.
    /// - Returns: Status response indicating whether transcripts are being collected.
    /// - Throws: `NetworkError` if the request fails.
    func fetchTranscriptStatus(channelId: String) async throws -> TranscriptStatusResponse

    /// Search for scenes within a live TV channel.
    ///
    /// - Parameters:
    ///   - channelId: Channel ID.
    ///   - query: Search query for topics or scenes.
    /// - Returns: Scene search response with timestamped results.
    /// - Throws: `NetworkError` if the request fails.
    func searchScenes(channelId: String, query: String) async throws -> SceneSearchResponse

    /// Fetch channel chat history for a specific channel.
    ///
    /// - Parameter channelId: Channel ID.
    /// - Returns: Channel chat history response with messages.
    /// - Throws: `NetworkError` if the request fails.
    func fetchChannelChatHistory(channelId: String) async throws -> ChannelChatHistoryResponse
}
