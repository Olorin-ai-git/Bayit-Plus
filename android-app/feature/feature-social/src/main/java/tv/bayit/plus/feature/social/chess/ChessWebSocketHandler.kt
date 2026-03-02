package tv.bayit.plus.feature.social.chess

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.model.ChessChatMessage
import tv.bayit.plus.core.model.ChessGame
import tv.bayit.plus.core.network.NetworkConfiguration
import tv.bayit.plus.core.network.websocket.ChannelType
import tv.bayit.plus.core.network.websocket.WebSocketConnection
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Inject

sealed interface ChessWsEvent {
    data class GameState(val game: ChessGame) : ChessWsEvent
    data class Move(
        val fen: String,
        val san: String,
        val captured: String?,
        val currentTurn: String?,
        val status: String?,
        val whiteTimeRemainingMs: Long?,
        val blackTimeRemainingMs: Long?,
    ) : ChessWsEvent
    data object DrawOffer : ChessWsEvent
    data class DrawResponse(val accepted: Boolean) : ChessWsEvent
    data class GameEnd(val status: String) : ChessWsEvent
    data class Resign(val status: String) : ChessWsEvent
    data class Chat(val message: ChessChatMessage) : ChessWsEvent
    data class ParseError(val raw: String) : ChessWsEvent
}

class ChessWebSocketHandler @Inject constructor(
    private val webSocketManager: WebSocketManager,
    private val networkConfig: NetworkConfiguration,
    private val logger: BayitLogger,
) {
    private val json = Json { ignoreUnknownKeys = true }
    private var connection: WebSocketConnection? = null

    fun connect(gameCode: String): Flow<ChessWsEvent> {
        val wsUrl = "${networkConfig.webSocketBaseUrl}/ws/chess/$gameCode"
        return connectToUrl(wsUrl)
    }

    fun connectToUrl(wsUrl: String): Flow<ChessWsEvent> {
        return flow {
            val conn = webSocketManager.connect(wsUrl, ChannelType.CHESS)
            connection = conn
            conn.messages.collect { raw ->
                val event = parseEvent(raw)
                if (event != null) emit(event)
            }
        }
    }

    fun send(message: String): Boolean {
        return connection?.send(message) ?: false
    }

    fun disconnect() {
        connection?.let { webSocketManager.disconnect(it.id) }
        connection = null
    }

    private fun parseEvent(raw: String): ChessWsEvent? {
        return try {
            val obj = json.parseToJsonElement(raw).jsonObject
            val type = obj["type"]?.jsonPrimitive?.content ?: return null
            val data = obj["data"]?.jsonObject ?: JsonObject(emptyMap())
            when (type) {
                "game_state" -> {
                    val gameJson = obj["game"]?.jsonObject ?: data
                    val game = json.decodeFromJsonElement(
                        kotlinx.serialization.serializer<ChessGame>(), gameJson
                    )
                    ChessWsEvent.GameState(game)
                }
                "move" -> parseMoveEvent(obj, data)
                "draw_offer" -> ChessWsEvent.DrawOffer
                "draw_response" -> {
                    val accepted = data["accepted"]?.jsonPrimitive?.boolean
                        ?: obj["accepted"]?.jsonPrimitive?.boolean ?: false
                    ChessWsEvent.DrawResponse(accepted)
                }
                "game_end" -> {
                    val status = data["status"]?.jsonPrimitive?.content
                        ?: obj["status"]?.jsonPrimitive?.content ?: "draw"
                    ChessWsEvent.GameEnd(status)
                }
                "resign" -> {
                    val status = data["status"]?.jsonPrimitive?.content
                        ?: obj["status"]?.jsonPrimitive?.content ?: "resigned"
                    ChessWsEvent.Resign(status)
                }
                "chat" -> {
                    val chatJson = data.takeIf { it.isNotEmpty() } ?: obj
                    val msg = json.decodeFromJsonElement(
                        kotlinx.serialization.serializer<ChessChatMessage>(), chatJson
                    )
                    ChessWsEvent.Chat(msg)
                }
                else -> null
            }
        } catch (e: Exception) {
            logger.error("Failed to parse chess WS message", e, mapOf("raw" to raw.take(200)))
            null
        }
    }

    private fun parseMoveEvent(obj: JsonObject, data: JsonObject): ChessWsEvent.Move {
        fun str(key: String) = data[key]?.jsonPrimitive?.content
            ?: obj[key]?.jsonPrimitive?.content
        fun lng(key: String) = try {
            data[key]?.jsonPrimitive?.long ?: obj[key]?.jsonPrimitive?.long
        } catch (_: Exception) { null }

        return ChessWsEvent.Move(
            fen = str("board_fen") ?: "",
            san = str("san") ?: "",
            captured = str("captured"),
            currentTurn = str("current_turn"),
            status = str("status"),
            whiteTimeRemainingMs = lng("white_time_remaining_ms"),
            blackTimeRemainingMs = lng("black_time_remaining_ms"),
        )
    }
}
